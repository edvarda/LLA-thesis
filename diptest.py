import diplib as dip
import numpy as np
import matplotlib.pyplot as plt


def clamp(num, min_value, max_value):
    return max(min(num, max_value), min_value)


# They should probably not be jpegs, but TIFF:s or something else that is lossless.
# shading_pre = dip.ImageRead('./shading_pre.jpg')
# shading_post = dip.ImageRead('./shading_post.jpg')
# depth = dip.ImageRead('./depth_texture.jpg')
bunny = dip.ImageRead('./bunny.jpg')

# images = [shading_pre, shading_post, depth]
images = [bunny]
V = []
E = []

for colorImage in images:
    scalarImg = dip.ColorSpaceManager.Convert(colorImage, 'gray')
    structureTensor = dip.StructureTensor(scalarImg)
    eigenvalues, eigenvectors = dip.EigenDecomposition(structureTensor)
    v = dip.LargestEigenvector(structureTensor)
    eigenvalues = dip.Eigenvalues(structureTensor)
    e = dip.SumTensorElements(eigenvalues)/2
    V.append(v)
    E.append(e)

# V_s, V_s_post, V_c = V
# e_s, e_s_post, e_c = E

# Then, here's my python interpretation of the formula for the congruence score:


def congruenceScore(V_s, V_c, e_s, e_c):
    return (e_c*(1-clamp((e_c-e_s), 0, 1))*abs(V_c*V_s))/e_c

# scoreBefore = congruenceScore(V_s, V_c, e_s, e_c)
# scoreAfter = congruenceScore(V_s_post, V_c, e_s_post, e_c)
