import glob
import sys
from collections import defaultdict
import diplib as dip
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image


def saveAsGrayscaleTIFF(imagePath):
    pngImage = Image.open(imagePath)
    grayscale = pngImage.convert('L')
    newFilePath = f"{imagePath.removesuffix('.png')}.tiff"
    grayscale.save(newFilePath)
    return newFilePath


def clamp(num, min_value, max_value):
    return max(min(num, max_value), min_value)


def asNpArraySum(image):
    return np.sum(np.asarray(image))


def congruenceScore(V_s, V_c, e_s, e_c):
    numerator = e_c * \
        np.subtract(1, np.clip(np.asarray(e_c-e_s), 0, 1)) * \
        dip.Abs(dip.DotProduct(V_c, V_s))
    denominator = e_c
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
    scoreAfter = congruenceScore(V_s_post, V_c, e_s_post, e_c)

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

    print(f"did {postshading}")
    return dict(file=filename, scoreBefore=scoreBefore, scoreAfter=scoreAfter, diff=(scoreAfter-scoreBefore), sigma=scaleString, range=rangeString, spatial=spatialString)


def printResults(results):
    print(f"Tested {len(results)} files")
    for x in results:
        print(f"Sigma: {x.get('sigma')}")
        print(
            f"Score – before: {x.get('scoreBefore')}, after: {x.get('scoreAfter')}")


def plotResults(results):

    fig, ax = plt.subplots(layout='constrained')
    ypoints = np.array([result.get("scoreAfter") for result in results])
    xpoints = np.array([result.get("sigma") for result in results])

    ax.bar(xpoints, ypoints)
    ax.xlabel("Scale enhanced")
    ax.ylabel("Congruence score after LLA pass")
    ax.xticks(rotation=70)
    ax.show(block=True)


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

    # penguin_means = {
    #     'Bill Depth': (18.35, 18.43, 14.98),
    #     'Bill Length': (38.79, 48.83, 47.50),
    #     'Flipper Length': (189.95, 195.82, 217.19),
    # }

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
    for filename in glob.glob(f"{folder}/*.png"):
        saveAsGrayscaleTIFF(filename)
    preshading = glob.glob(f"{folder}/preShading.tiff").pop()
    depth = glob.glob(f"{folder}/depth.tiff").pop()
    testImages = [x for x in glob.glob(f"{folder}/*_postShading.tiff")]
    results = [runTest(preshading, depth, testImage)
               for testImage in testImages]
    results.sort(key=lambda result: result.get("file"))

    resultGroups = defaultdict(list)
    for result in results:
        resultGroups[result.get("range")].append(result)
        print(result.get("sigma"))
        print(result.get("range"))

    fig, ax = plt.subplots(2, 2, layout='constrained')
    for ((k, v), plot) in zip(resultGroups.items(), ax.flat):
        print(f"{k} group: ")
        print(f"plot: {plot}")
        perRangePlot(plot, v)
    plt.show(block=True)
    # printResults(results)
    # plotResults(results)


dir = sys.argv[1]
runInFolder(dir)

# for folder in folders:
#     tiffImages = [saveAsGrayscaleTIFF(x)
#                   for x in glob.glob(f"{folder}/*.png")]

#     preshading = glob.glob(f"{folder}/*_pre_shading.tiff").pop()
#     depth = glob.glob(f"{folder}/*_depth.tiff").pop()
#     postImages = [x for x in glob.glob(f"{folder}/*_post_shading.tiff")]
#     results = [runTest(preshading, depth, postshading)
#                for postshading in postImages]
#     results.sort(key=lambda result: result.get("file"))
#     printResults(results)
#     plotResults(results)
