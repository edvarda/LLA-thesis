import glob
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

    file = postshading.removeprefix("./testrenders/")
    start = file.find("_Sigma_")+7
    end = file.find("_Epsilon_")
    sigmaString = file[start:end]
    start = file.find("name")+4
    end = file.find("_LLA_")
    nameString = file[start:end]
    print(f"did {postshading}")
    return dict(file=file, scoreBefore=scoreBefore, scoreAfter=scoreAfter, diff=(scoreAfter-scoreBefore), sigma=sigmaString, name=nameString)


def printResults(results):
    print(f"Tested {len(results)} files")
    for x in results:
        print(f"Sigma: {x.get('sigma')}")
        print(
            f"Score – before: {x.get('scoreBefore')}, after: {x.get('scoreAfter')}")


def plotResults(results):
    ypoints = np.array([result.get("diff") for result in results])
    xpoints = np.array([result.get("name") for result in results])
    plt.bar(xpoints, ypoints)
    plt.xlabel("Scale enhanced")
    plt.ylabel("Difference in congruence score after LLA pass")
    plt.xticks(rotation=70)
    plt.tight_layout()
    plt.show(block=True)


folderpath = "./testrenders/*"
folders = [x for x in glob.glob(folderpath)]

for folder in folders:
    print(f"Running tests in: {folder}")
    tiffImages = [saveAsGrayscaleTIFF(x)
                  for x in glob.glob(f"{folder}/*.png")]

    preshading = glob.glob(f"{folder}/*_pre_shading.tiff").pop()
    depth = glob.glob(f"{folder}/*_depth.tiff").pop()
    postImages = [x for x in glob.glob(f"{folder}/*_post_shading.tiff")]
    results = [runTest(preshading, depth, postshading)
               for postshading in postImages]
    results.sort(key=lambda result: result.get("file"))
    printResults(results)
    plotResults(results)
