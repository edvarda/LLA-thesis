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


def createScaleSpaceTestPlot(results):
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


def linePlot(data):
    # plt.rcParams['text.usetex'] = True
    fig, ax = plt.subplots()

    xValue = "strength" 
    yValue = "diff"
    legendTitle = "Scenario"
    title = "Score improvement per scenario"
    yLabel = "Congruence score improvement"
    xLabel = "Enhancement strength"

    david = data["david1"]
    xValues = list({x.get(xValue) for x in david})
    # print(xValues)

    # xValues = ['Scale 1','Scale 2','Scale 3','Scale 4']


    for scenario in data:
        testCases = data[scenario]
        xSeries = [x[xValue] for x in testCases]
        ySeries = [x[yValue] for x in testCases]
        ax.plot(xSeries, ySeries,label=scenario)
    
    x = np.arange(len(xValues))  # the label locations
    width = 0.15  # the width of the bars
    ax.set_ylabel(yLabel)
    ax.set_xlabel(xLabel)
    # ax.set_title(title)
    ax.set_xticks(x + width, xValues)
    ax.legend()
    ax.grid()
    ax.set_ylim(0, .6)
    plt.show(block=True)
    

def formatDataForLinePlot(results):
    
    def testCaseFilter(case):
      return case["range"].startswith("0.05") and case["spatial"].startswith("2.3") and case["sigma"] in ["1","2","3","4"]
    def testCaseFilterS(case):
      return case["spatial"].startswith("2.3") and case["sigma"].startswith("Coarse")
    
    data = dict()
    for scenario in results:
        if scenario == "map2": continue
        series = filter(testCaseFilterS,results[scenario])
        data[scenario] = list(series)
    return data    
        


filename = sys.argv[1]
dir = sys.argv[2]
path = Path(dir)
results = load_object(filename)
print(type(results))
data = formatDataForLinePlot(results)
linePlot(data)

# for scenario in results:
#   createScaleSpaceTestPlot(results[scenario])
#   saveFig(
#           (
#               path
#               / f"{scenario}_scalePlot.png"
#           )
#       )
