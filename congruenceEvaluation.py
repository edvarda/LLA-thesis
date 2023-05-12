import glob
import sys
from collections import defaultdict
import diplib as dip
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
from pathlib import Path
import math


def saveAsGrayscaleTIFF(imagePath):
    if Path(imagePath.with_suffix(".tiff")).is_file():  # If it already exists, return
        return
    pngImage = Image.open(imagePath)
    grayscale = pngImage.convert("L")
    grayscale.save(imagePath.with_suffix(".tiff"))


def clamp(num, min_value, max_value):
    return max(min(num, max_value), min_value)


def asNpArraySum(image):
    return np.sum(np.asarray(image))


def congruenceScore(V_s, V_c, e_s, e_c, saveFalseColor=False):
    numerator = (
        e_c
        * np.subtract(1, np.clip(np.asarray(e_c - e_s), 0, 1))
        * dip.Abs(dip.DotProduct(V_c, V_s))
    )

    denominator = e_c
    if saveFalseColor:
        scorePerPixel = numerator / denominator
        displayImage = dip.ImageDisplay(scorePerPixel, "base")
        colorMap = dip.ApplyColorMap(displayImage, "diverging")

    return asNpArraySum(numerator) / asNpArraySum(denominator)


def congruenceScoreFalseColorTest(V_s, V_s_post, e_s, e_s_post, V_c, e_c):
    e_s.Show()
    wait = input("Press Enter to continue.")
    e_c.Show()
    wait = input("Press Enter to continue.")

    def numerator(V_s, e_s, V_c, e_c):
        return (
            e_c
            * np.subtract(1, np.clip(np.asarray(e_c - e_s), 0, 1))
            * dip.Abs(dip.DotProduct(V_c, V_s))
        )

    denominator = e_c
    pre = numerator(V_s, e_s, V_c, e_c) / denominator
    post = numerator(V_s_post, e_s_post, V_c, e_c) / denominator

    preDisplay = dip.ImageDisplay(pre, "base")
    preColor = dip.ApplyColorMap(preDisplay, "diverging")
    preColor.Show()
    wait = input("Press Enter to continue.")

    postDisplay = dip.ImageDisplay(post, "base")
    postColor = dip.ApplyColorMap(postDisplay, "diverging")
    postColor.Show()
    wait = input("Press Enter to continue.")

    result = post - pre
    resDisplay = dip.ImageDisplay(result, "base")
    resultColor = dip.ApplyColorMap(resDisplay, "diverging")
    resultColor.Show()

    # dip.ImageWrite(colorMap, "colormap.jpg")

    wait = input("Press Enter to continue.")
    return


def runTest(preshading, depth, postshading):
    shading_pre = dip.ImageRead(preshading)
    shading_post = dip.ImageRead(postshading)
    depth = dip.ImageRead(depth)

    V = []
    E = []

    for colorImage in [shading_pre, shading_post, depth]:
        scalarImg = dip.ColorSpaceManager.Convert(colorImage, "gray")
        structureTensor = dip.StructureTensor(scalarImg)
        eigenvalues, eigenvectors = dip.EigenDecomposition(structureTensor)
        v = dip.LargestEigenvector(structureTensor)
        eigenvalues = dip.Eigenvalues(structureTensor)
        e = dip.SumTensorElements(eigenvalues) / 2

        V.append(v)
        E.append(e)

    V_s, V_s_post, V_c = V
    e_s, e_s_post, e_c = E

    scoreBefore = congruenceScore(V_s, V_c, e_s, e_c)
    scoreAfter = congruenceScore(V_s_post, V_c, e_s_post, e_c)

    congruenceScoreFalseColorTest(V_s, V_s_post, e_s, e_s_post, V_c, e_c)

    filename = postshading.removeprefix("./testrenders/")

    start = filename.find("Scale[") + 6
    end = filename.find("]", start)
    scaleString = filename[start:end]

    start = filename.find("Range[") + 6
    end = filename.find("]", start)
    rangeString = filename[start:end]

    start = filename.find("Spatial[") + 8
    end = filename.find("]", start)
    spatialString = filename[start:end]

    start = filename.find("Strength[") + 9
    end = filename.find("]", start)
    strengthString = filename[start:end]

    print(f"Processed {postshading}")
    return dict(
        file=filename,
        scoreBefore=scoreBefore,
        scoreAfter=scoreAfter,
        diff=(scoreAfter - scoreBefore),
        sigma=scaleString,
        range=rangeString,
        spatial=spatialString,
        strength=strengthString,
    )


def printResults(results):
    print(f"Tested {len(results)} files")
    for x in results:
        print(f"Sigma: {x.get('sigma')}")
        print(f"Score – before: {x.get('scoreBefore')}, after: {x.get('scoreAfter')}")


def groupedBarPlot(
    plot, results, xValue, yValue, barGroupValue, legendTitle, title, yLabel, xLabel
):
    scaleValues = list({x.get(xValue) for x in results})
    scaleValues.sort()

    scorePerScaleSpace = defaultdict(list)
    for result in results:
        scorePerScaleSpace[result.get(barGroupValue)].append(
            (result.get(yValue), result.get(xValue))
        )
    for scoreByScaleSpace in scorePerScaleSpace.values():
        scoreByScaleSpace.sort(key=lambda x: x[1])

    x = np.arange(len(scaleValues))  # the label locations
    width = 0.15  # the width of the bars

    multiplier = 0
    for scaleSpace, congruenceScores in scorePerScaleSpace.items():
        offset = width * multiplier
        scores = [round(congruenceScore[0], 2) for congruenceScore in congruenceScores]
        rects = plot.bar(
            x + offset, scores, width, label=f"{legendTitle}: {scaleSpace}"
        )
        plot.bar_label(rects, padding=3, rotation=90)
        multiplier += 1

    # Add some text for labels, title and custom x-axis tick labels, etc.
    plot.set_ylabel(yLabel)
    plot.set_xlabel(xLabel)
    plot.set_title(title)
    plot.set_xticks(x + width, scaleValues)
    plot.legend()
    # plot.set_ylim(0, 1)


def getGroupedResults(results, dictStringToGroupOn):
    resultGroups = defaultdict(list)
    for result in results:
        resultGroups[result.get(dictStringToGroupOn)].append(result)
    return resultGroups


def saveFig(path):
    print("saving fig")
    figure = plt.gcf()  # get current figure
    figure.set_size_inches(20, 14)
    plt.savefig(path, bbox_inches="tight", dpi=100)


def round_up(n, decimals=0):
    multiplier = 10**decimals
    return math.ceil(n * multiplier) / multiplier


def round_down(n, decimals=0):
    multiplier = 10**decimals
    return math.floor(n * multiplier) / multiplier


def setYlimits(plot, results, key):
    maxValue = max([x.get(key) for x in results])
    minValue = min([x.get(key) for x in results])
    plot.set_ylim(round_down(minValue, 1), round_up(maxValue, 1))


def runTestsInFolder(folder):
    for filename in folder.glob("./*.png"):
        saveAsGrayscaleTIFF(filename)
    preshading = str(folder / "./preShading.tiff")
    depth = str(folder / "./depth.tiff")
    testImages = [str(x) for x in folder.glob("./*_postShading.tiff")]
    results = [runTest(preshading, depth, testImage) for testImage in testImages]
    results.sort(key=lambda result: result.get("file"))
    return results


def createStrengthTestPlot(folder, results):
    fig, ax = plt.subplots(2, 2)
    resultGroups = getGroupedResults(results, "spatial")
    for (k, v), plot in zip(resultGroups.items(), ax.flat):
        setYlimits(plot, results, "diff")
        title = f"For Scale Space={k}"
        legendTitle = "Enhanchment strength (sigma parameter)"
        groupedBarPlot(
            plot,
            v,
            "sigma",
            "diff",
            "strength",
            legendTitle,
            title,
            "Congruence score difference",
            "Scale(s) used for enhancment",
        )
    saveFig(
        (
            folder.parents[0]
            / f"{str(folder.name).removeprefix('StrengthTests_')}_strengthPlot.png"
        )
    )


def createScaleSpaceTestPlot(folder, results):
    fig, ax = plt.subplots(2, 2)
    resultGroups = getGroupedResults(results, "spatial")
    for (k, v), plot in zip(resultGroups.items(), ax.flat):
        setYlimits(plot, results, "diff")
        title = f"For Spatial kernel sizes={k}"
        legendTitle = "Range kernel sizes"
        groupedBarPlot(
            plot,
            v,
            "sigma",
            "diff",
            "range",
            legendTitle,
            title,
            "Congruence score difference",
            "Scale(s) used for enhancment",
        )
    saveFig(
        (
            folder.parents[0]
            / f"{str(folder.name).removeprefix('ScaleSpaceTests_')}_scalePlot.png"
        )
    )


dir = sys.argv[1]
for path in Path(dir).iterdir():
    if path.is_dir():
        results = runTestsInFolder(path)
        print(f"Processing tests in {path}")
        if str(path.name).startswith("StrengthTests"):
            createStrengthTestPlot(path, results)
        elif str(path.name).startswith("ScaleSpaceTests"):
            createScaleSpaceTestPlot(path, results)
