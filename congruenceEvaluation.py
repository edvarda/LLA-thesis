import glob
import sys
from collections import defaultdict
import diplib as dip
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
from pathlib import Path


def saveAsGrayscaleTIFF(imagePath):
    pngImage = Image.open(imagePath)
    grayscale = pngImage.convert('L')
    grayscale.save(imagePath.with_suffix('.tiff'))


def clamp(num, min_value, max_value):
    return max(min(num, max_value), min_value)


def asNpArraySum(image):
    return np.sum(np.asarray(image))


def congruenceScore(V_s, V_c, e_s, e_c, saveFalseColor=False):
    numerator = e_c * \
        np.subtract(1, np.clip(np.asarray(e_c-e_s), 0, 1)) * \
        dip.Abs(dip.DotProduct(V_c, V_s))
    denominator = e_c
    if (saveFalseColor):
        scorePerPixel = (numerator/denominator)
        displayImage = dip.ImageDisplay(scorePerPixel, "base")
        colorMap = dip.ApplyColorMap(displayImage, "diverging")
        # dip.ImageWrite(colorMap, "colormap.jpg")
    return (asNpArraySum(numerator)/asNpArraySum(denominator))


def runTest(preshading, depth, postshading):
    shading_pre = dip.ImageRead(preshading)
    shading_post = dip.ImageRead(postshading)
    depth = dip.ImageRead(depth)

    V = []
    E = []

    for colorImage in [shading_pre, shading_post, depth]:
        scalarImg = dip.ColorSpaceManager.Convert(colorImage, 'gray')
        structureTensor = dip.StructureTensor(scalarImg)
        eigenvalues, eigenvectors = dip.EigenDecomposition(structureTensor)
        v = dip.LargestEigenvector(structureTensor)
        eigenvalues = dip.Eigenvalues(structureTensor)
        e = dip.SumTensorElements(eigenvalues)/2
        V.append(v)
        E.append(e)

    V_s, V_s_post, V_c = V
    e_s, e_s_post, e_c = E

    scoreBefore = congruenceScore(V_s, V_c, e_s, e_c)
    scoreAfter = congruenceScore(V_s_post, V_c, e_s_post, e_c, True)

    filename = postshading.removeprefix("./testrenders/")

    start = filename.find("Scale[")+6
    end = filename.find("]", start)
    scaleString = filename[start:end]

    start = filename.find("Range[")+6
    end = filename.find("]", start)
    rangeString = filename[start:end]

    start = filename.find("Spatial[")+8
    end = filename.find("]", start)
    spatialString = filename[start:end]

    print(f"Processed {postshading}")
    return dict(file=filename, scoreBefore=scoreBefore, scoreAfter=scoreAfter, diff=(scoreAfter-scoreBefore), sigma=scaleString, range=rangeString, spatial=spatialString)


def printResults(results):
    print(f"Tested {len(results)} files")
    for x in results:
        print(f"Sigma: {x.get('sigma')}")
        print(
            f"Score – before: {x.get('scoreBefore')}, after: {x.get('scoreAfter')}")


def perRangePlot(plot, results):
    scaleValues = list({x.get("sigma") for x in results})
    scaleValues.sort()
    species = ("Adelie", "Chinstrap", "Gentoo")

    scorePerScaleSpace = defaultdict(list)
    for result in results:
        scorePerScaleSpace[result.get("spatial")].append(
            (result.get("scoreAfter"), result.get("sigma")))
    for scoreByScaleSpace in scorePerScaleSpace.values():
        scoreByScaleSpace.sort(key=lambda x: x[1])

    x = np.arange(len(scaleValues))  # the label locations
    width = 0.30  # the width of the bars

    multiplier = 0
    for scaleSpace, congruenceScores in scorePerScaleSpace.items():
        offset = width * multiplier
        scores = [round(congruenceScore[0], 2)
                  for congruenceScore in congruenceScores]
        rects = plot.bar(x + offset, scores, width,
                         label=f"Scalespace: {scaleSpace}")
        plot.bar_label(rects, padding=3, rotation=90)
        multiplier += 1

    # Add some text for labels, title and custom x-axis tick labels, etc.
    plot.set_ylabel('Congruence score')
    plot.set_xlabel('Scale(s) used for enhancment')
    plot.set_title(f'For RangeSigma={results[0].get("range")}')
    plot.set_xticks(x + width, scaleValues)
    plot.legend()
    plot.set_ylim(0, 1)


def runInFolder(folder):
    for filename in folder.glob("./*.png"):
        saveAsGrayscaleTIFF(filename)
    preshading = str(folder / "./preShading.tiff")
    depth = str(folder / "./depth.tiff")
    testImages = [str(x) for x in folder.glob("./*_postShading.tiff")]
    results = [runTest(preshading, depth, testImage)
               for testImage in testImages]
    results.sort(key=lambda result: result.get("file"))

    resultGroups = defaultdict(list)
    for result in results:
        resultGroups[result.get("range")].append(result)

    fig, ax = plt.subplots(2, 2, layout='constrained')
    for ((k, v), plot) in zip(resultGroups.items(), ax.flat):
        perRangePlot(plot, v)
    plt.show(block=True)


dir = sys.argv[1]
path = Path(dir)
runInFolder(path)
