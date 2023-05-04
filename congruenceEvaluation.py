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


def newPlot(results):
    spatialGroups = defaultdict(list)
    for result in results:
        spatialGroups[result.get("spatial")].append(result)

    ranges = list()

    keys = list(spatialGroups.keys())
    xvalues = [x.get("sigma") for x in [y for y in spatialGroups.values()]]
    yvalues = [x.get("scoreAfter")
               for x in [y for y in spatialGroups.values()]]

    ypoints = np.array([result.get("scoreAfter") for result in results])
    xpoints = np.array([result.get("sigma") for result in results])

    # set width of bars
    barWidth = 0.15

    # Set position of bar on X axis
    r1 = np.arange(len(values[0]))
    r2 = [x + barWidth for x in r1]
    r3 = [x + barWidth for x in r2]

    # Make the plot
    plt.bar(r1, values[0], color='#7f6d5f', width=barWidth,
            edgecolor='white', label=keys[0])
    plt.bar(r2, values[1], color='#557f2d', width=barWidth,
            edgecolor='white', label=keys[1])
    plt.bar(r3, values[2], color='#2d7f5e', width=barWidth,
            edgecolor='white', label=keys[2])

    # Add xticks on the middle of the group bars
    plt.xlabel('Scales', fontweight='bold')
    plt.xticks([r + barWidth for r in range(len(values[0]))],
               ['A', 'B', 'C', 'D', 'E'])  # set comprehension

    # Create legend & Show graphic
    plt.legend()
    plt.show(block=True)


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

    print("groups:")
    for (k, v) in resultGroups.items():
        newPlot(v)

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
