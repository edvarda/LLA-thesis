import glob
import diplib as dip
import numpy as np
import matplotlib.pyplot as plt


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

# They should probably not be jpegs, but TIFF:s or something else that is lossless. Or are my jpg:s lossless?


def runTest(path):

    shading_pre = dip.ImageRead(f"{path}_pre_shading.jpg")
    shading_post = dip.ImageRead(f"{path}_post_shading.jpg")
    depth = dip.ImageRead(f"{path}_depth.jpg")

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

    file = path.removeprefix("./testrenders/")
    start = file.find("_Sigma_")+7
    end = file.find("_Epsilon_")
    sigmaString = file[start:end]
    start = file.find("name")+4
    end = file.find("_LLA_")
    nameString = file[start:end]
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
    images = [x.removesuffix('_pre_shading.jpg')
              for x in glob.glob(f"{folder}/*_pre_shading.jpg")]
    results = [runTest(image) for image in images]
    results.sort(key=lambda result: result.get("file"))
    printResults(results)
    plotResults(results)
