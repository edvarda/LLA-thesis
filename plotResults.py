import pickle
import numpy as np
import matplotlib.pyplot as plt
import math
from pathlib import Path
import sys
from collections import defaultdict


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


def load_object(filename):
    try:
        with open(filename, "rb") as f:
            return pickle.load(f)
    except Exception as ex:
        print("Error during unpickling object (Possibly unsupported):", ex)
 

filename = sys.argv[1]
dir = sys.argv[2]
path = Path(dir)
results = load_object(filename)
createScaleSpaceTestPlot(results)

saveFig(
        (
            path.parents[0]
            / f"{str(path.name).removeprefix('ScaleSpaceTests_')}_scalePlot.png"
        )
    )
