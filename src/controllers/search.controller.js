var Router = require('express');
var router = Router();
const questionServices = require('../services/question.services');
const searchServices = require('../services/search.services');
const arrayEqual = require('array-equal')

//API Endpoints
router.get('/day', getDaily)
router.get('/week', getWeekly)


//Controller functions
async function getDaily(req, res) {
    const name = req.body.name
    const date = new Date(Date.now())

    try {
        let qset = await questionServices.find(name, date);
        if (qset.length === 0) {
            throw {
                error: true,
                message: "Can't find requested questionnaire, could be: 1. the questionnaire does not exist, hit question/today first, 2. request body error, check that you have a correct name field in your request body"
            }
        }
        else {
            qset = qset[0]
        }
        res.status(200)
        res.send(qset.summary)
    }
    catch (err) {
        res.status(400)
        console.log(err)
        res.send(err.message)
    }
}

async function getWeekly(req, res) {
    const name = req.body.name
    let date;
    //req.body.week should be a integer value less or equal to 0, representing weeks from the current week.
    if (req.body.week == undefined) {
        const today = new Date(Date.now())
        date = new Date (today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
    }
    else {
        const today = new Date(Date.now())
        date = new Date (today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + (7 * req.body.week))
    }
    try {
        let qsetArr = await questionServices.findWeek(name, date)

        if (qsetArr.length === 0) {
            throw {
                error: true,
                message: "Can't find requested set of questionnaires, could be: 1. the questionnaire does not exist 2. request body error, check that you have a correct name field in your request body, and a correct week value"
            }
        }

        const numOfSet = qsetArr.length
        const setOfSummary = []
        let resultSummary
        const averageSums = []

        qsetArr.map((qset) => {
            setOfSummary.push(qset.summary)
        })

        setOfSummary.map((sum, i) => {
            if (i == 0) {
                resultSummary = {
                    measures: sum.measures,
                    averages: []
                }
                sum.averages.map((average) => {
                    averageSums.push(average)
                })
            }
            else {
                if (!arrayEqual(sum.measures, resultSummary.measures)) {
                    throw {
                        error: true,
                        message: "Changes have been made to your measuring metrics in the past week, try again next week!"
                    }
                }
                else {
                    sum.averages.map((average, j) => {
                        averageSums[j] += average
                    })
                }
            }
        })
        for (i = 0; i < averageSums.length; i++) {
            resultSummary.averages[i] = averageSums[i] / numOfSet
        }

        res.status(200)
        res.send(resultSummary)
    }

    catch(err) {
        if (err.message == "Cannot read property 'measures' of undefined") {
            res.send("You are querying legacy data where summary on save was not implemented!")
        }
        else {
            res.status(400)
            res.send(err.message)
        }
    }
}

module.exports = router