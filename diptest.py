import diplib as dip
import numpy as np
import matplotlib.pyplot as plt


def clamp(num, min_value, max_value):
    return max(min(num, max_value), min_value)


def asNpArraySum(image):
    return np.sum(np.asarray(image))


folder = "testrenders"
prefix = "EMP3"
# They should probably not be jpegs, but TIFF:s or something else that is lossless. Or are my jpg:s lossless?
shading_pre = dip.ImageRead(f"./{folder}/{prefix}_pre_shading.jpg")
shading_post = dip.ImageRead(f"./{folder}/{prefix}_post_shading.jpg")
depth = dip.ImageRead(f"./{folder}/{prefix}_depth.jpg")

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


def congruenceScore(V_s, V_c, e_s, e_c):
    numerator = e_c * \
        np.subtract(1, np.clip(np.asarray(e_c-e_s), 0, 1)) * \
        dip.Abs(dip.DotProduct(V_c, V_s))
    denominator = e_c
    return (asNpArraySum(numerator)/asNpArraySum(denominator))


scoreBefore = congruenceScore(V_s, V_c, e_s, e_c)
scoreAfter = congruenceScore(V_s_post, V_c, e_s_post, e_c)

print(f"Score before: {scoreBefore}")
print(f"Score after: {scoreAfter}")
