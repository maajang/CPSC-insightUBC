import InsightFacade from "../src/controller/InsightFacade";
import {QueryRequest, QueryResponse, default as QueryController} from "../src/controller/QueryController";
import Log from "../src/Util";
import {expect} from 'chai';
import {InsightResponse} from "../src/controller/InsightFacade";
import JSZip = require('jszip');
import {Datasets} from "../src/controller/DatasetController";

/**
 * Created by Kirsten on 2016-10-18.
 */

describe("D2Query", function () {


    let facade: InsightFacade;
    let query: QueryRequest;
    let zipFileContents: any;

    before(function () {
        var fs = require('fs');
        var dataPath = __dirname.split('/test')[0] + '/data/courseList/';       // will this work across systems?


        var zip = new JSZip;
        zip.folder('courses')
            .file('ADHE328', fs.readFileSync(dataPath + 'ADHE328.json'))
            .file('ASIA315', fs.readFileSync(dataPath + 'ASIA315.json'))
            .file('ASIA317', fs.readFileSync(dataPath + 'ASIA317.json'))
            .file('CPSC320', fs.readFileSync(dataPath + 'CPSC320.json'));
        const opts = {compression: 'deflate', compressionOptions: {level: 2}, type: 'base64'};
        return zip.generateAsync(opts)
            .then(function (data: any) {
                zipFileContents = data;
            }).then(function () {
            }).catch(function (err) {
                Log.trace('before fn test ' + err);
            })
    });

    beforeEach(function () {
        facade = new InsightFacade();
    });

    after(function () {
        //facade.removeDataset('courses');
    })


    it("Should be able to add a add a new dataset (204)", function () {
        var that = this;
        Log.trace("Starting test: " + that.test.title);
        return facade.addDataset('courses', zipFileContents).then(function (response: InsightResponse) {
            expect(response.code).to.equal(204);
        }).catch(function (response: InsightResponse) {
            Log.test(JSON.stringify(response.body));
            expect.fail('Should not happen');
        });
    });

    it("Should be able to update an existing dataset (201)", function () {
        var that = this;
        Log.trace("Starting test: " + that.test.title);



        return facade.addDataset('courses', zipFileContents).then(function (response: InsightResponse) {
            Log.trace('response: ' + JSON.stringify(response));
            expect(response.code).to.equal(201);
        }).catch(function (response: InsightResponse) {
            expect.fail('Should not happen');
        });
    });

    it("Should not be able to add an invalid dataset (400)", function () {
        var that = this;
        Log.trace("Starting test: " + that.test.title);
        return facade.addDataset('courses', 'some random bytes').then(function (response: InsightResponse) {
            expect.fail();
        }).catch(function (response: InsightResponse) {
            expect(response.code).to.equal(400);
            Log.test('response body: ' + JSON.stringify(response.body));
        });
    });

    it("Should allow WHERE to be empty {}", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_dept"],
            "WHERE": {},
            "ORDER": "courses_dept",
            "AS": "TABLE"
        };

        let isValid = controller.isValid(query);
        expect(isValid).to.equal(true);
    });




    it("Should reject query with empty GROUP", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_dept"],
            "WHERE": {},
            "GROUP": [],
            "APPLY": [{"courseAverage": {"AVG": "courses_avg"}}],
            "ORDER": "courses_dept",
            "AS": "TABLE"
        };

        let isValid = controller.isValid(query);
        expect(isValid).to.equal(false);
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            expect.fail();
        }).catch(function (ret: InsightResponse) {
            expect(ret).to.eql({code: 400, body: {error: 'Invalid query'}});
        });
    });

    it("GROUP cannot exist without APPLY", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_dept"],
            "WHERE": {},
            "GROUP": ["courses_id"],
            "ORDER": "courses_dept",
            "AS": "TABLE"
        };

        let isValid = controller.isValid(query);
        expect(isValid).to.equal(false);
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            expect.fail();
        }).catch(function (ret: InsightResponse) {
            expect(ret).to.eql({code: 400, body: {error: 'Invalid query'}});
        });
    });

    it("APPLY cannot exist without GROUP", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_dept"],
            "WHERE": {},
            "APPLY": [{"courseAverage": {"AVG": "courses_avg"}}],
            "ORDER": "courses_dept",
            "AS": "TABLE"
        };

        let isValid = controller.isValid(query);
        expect(isValid).to.equal(false);
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            expect.fail();
        }).catch(function (ret: InsightResponse) {
            expect(ret).to.eql({code: 400, body: {error: 'Invalid query'}});
        });
    });

    it("If GROUP present all GET terms must correspond to either GROUP terms or to terms defined in the APPLY block", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_id", "courseAverage"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}},
            "GROUP": ["courses_id"],
            "APPLY": [{"courseAverage": {"AVG": "courses_avg"}}],
            "ORDER": "courses_id",
            "AS": "TABLE"
        };
        var isValid = controller.isValid(query);
        expect(isValid).to.equal(true);
    });

    it("GROUP present1: all GET terms must be in either GROUP terms or APPLY-defined terms", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_id", "courses_dept", "courseAverage"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}},
            "GROUP": ["courses_id"],
            "APPLY": [{"courseAverage": {"AVG": "courses_avg"}}],
            "ORDER": "courses_id",
            "AS": "TABLE"
        };
        let isValid = controller.isValid(query);
        expect(isValid).to.equal(false);
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            expect.fail();
        }).catch(function (ret: InsightResponse) {
            expect(ret).to.eql({code: 400, body: {error: 'Invalid query'}});
        });
    });

    it("GROUP present2: all GET terms must be in either GROUP terms or APPLY-defined terms", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_id", "courseAverage", "courseMax"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}},
            "GROUP": ["courses_id"],
            "APPLY": [{"courseAverage": {"AVG": "courses_avg"}}],
            "ORDER": "courses_id",
            "AS": "TABLE"
        };
        let isValid = controller.isValid(query);
        expect(isValid).to.equal(false);
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            expect.fail();
        }).catch(function (ret: InsightResponse) {
            expect(ret).to.eql({code: 400, body: {error: 'Invalid query'}});
        });
    });

    it("GROUP present3: all GET terms must be in either GROUP terms or APPLY-defined terms", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_id", "courseAverage"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}},
            "GROUP": ["courses_dept", "courses_id"],
            "APPLY": [{"courseAverage": {"AVG": "courses_avg"}}],
            "ORDER": "courses_id",
            "AS": "TABLE"
        };
        let isValid = controller.isValid(query);
        expect(isValid).to.equal(false);
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            expect.fail();
        }).catch(function (ret: InsightResponse) {
            expect(ret).to.eql({code: 400, body: {error: 'Invalid query'}});
        });
    });

    it("all APPLY and GROUP terms must appear in GET - 1", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_id", "courseAverage"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}},
            "GROUP": ["courses_id"],
            "APPLY": [{"courseAverage": {"AVG": "courses_avg"}}, {"sections": {"COUNT": "courses_uuid"}}],
            "ORDER": "courses_id",
            "AS": "TABLE"
        };
        var isValid = controller.isValid(query);
        expect(isValid).to.equal(false);
    });

    it("all APPLY and GROUP terms must appear in GET - 2", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_id", "courseAverage"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}},
            "GROUP": ["courses_id", "courses_dept"],
            "APPLY": [{"courseAverage": {"AVG": "courses_avg"}}],
            "ORDER": "courses_id",
            "AS": "TABLE"
        };
        var isValid = controller.isValid(query);
        expect(isValid).to.equal(false);
    });

    it("All terms in GROUP must be separated by underscore", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_id", "courseAverage", "courseInstructor"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}},
            "GROUP": ["courses_id", "courseInstructor"],
            "APPLY": [{"courseAverage": {"AVG": "courses_avg"}}],
            "ORDER": "courses_id",
            "AS": "TABLE"
        };
        let isValid = controller.isValid(query);
        expect(isValid).to.equal(false);
    });

    it("APPLY terms should not be separated by underscore", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_id", "courses_dept", "course_avg"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}},
            "GROUP": ["courses_dept", "courses_id"],
            "APPLY": [{"course_avg": {"AVG": "courses_avg"}}],
            "ORDER": "courses_id",
            "AS": "TABLE"
        };
        let isValid = controller.isValid(query);
        expect(isValid).to.equal(false);
    });


    it("Empty WHERE should return all rows", function () {
        let query = {
            "GET": ["courses_dept"],
            "WHERE": {},
            "ORDER": "courses_dept",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (ret: InsightResponse) {
            expect(ret.body).to.eql({render: 'TABLE', result: listOfDepts});
            expect(ret.code).to.equal(200);
        });
    });

    it("Should be able to order by key defined in APPLY", function () {    // should not be passing - implementation incomplete
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_id", "courses_dept", "courseAverage"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}},
            "GROUP": ["courses_dept", "courses_id"],
            "APPLY": [{"courseAverage": {"AVG": "courses_avg"}}],
            "ORDER": "courseAverage",
            "AS": "TABLE"
        };

        let isValid = controller.isValid(query);
        expect(isValid).to.equal(true);
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            expect(ret.code).to.equal(200);
            expect(ret.body).to.eql({
                render: 'TABLE',
                result: [{"courses_id": "320", "courses_dept": "cpsc", "courseAverage": 70.61}]
            });      // not the expected output
        });
    });

    it("Should reject D2 query where ORDER keys are not all in either GET or APPLY", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_id", "courseAverage"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}},
            "GROUP": ["courses_id"],
            "APPLY": [{"courseAverage": {"AVG": "courses_avg"}}],
            "ORDER": {"dir": "UP", "keys": ["courseAverage", "courses_id", "courses_dept"]},
            "AS": "TABLE"
        };

        let isValid = controller.isValid(query);
        expect(isValid).to.equal(false);
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            expect.fail();
        }).catch(function (ret: InsightResponse) {
            expect(ret).to.eql({code: 400, body: {error: 'Invalid query'}});
        });
    });

    it("If GET and APPLY undefined, all order terms must be in GET", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_id", "courseAverage"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}},
            "ORDER": {"dir": "UP", "keys": ["courseAverage", "courses_id", "courses_dept"]},
            "AS": "TABLE"
        };

        let isValid = controller.isValid(query);
        expect(isValid).to.equal(false);
    });

    // it.only("Should throw error if ORDER direction is not UP or DOWN", function () {
    //     let dataset: Datasets = {};
    //     let controller = new QueryController(dataset);
    //     query = {
    //         "GET": ["courses_id", "courseAverage"],
    //         "WHERE": {"IS": {"courses_dept": "cpsc"}},
    //         "ORDER": {"dir": "SIDEWAYS", "keys": ["courseAverage", "courses_id", "courses_dept"]},
    //         "AS": "TABLE"
    //     };
    //
    //     return facade.performQuery(query).then(function (result: InsightResponse) {
    //         expect.fail();
    //     }).catch(function (result: InsightResponse) {
    //         expect(result.code).to.equal(400);
    //     })
    // });

    it("Should improperly-formed ORDER", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        query = {
            "GET": ["courses_id", "courseAverage"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}},
            "GROUP": ["courses_id"],
            "APPLY": [{"courseAverage": {"AVG": "courses_avg"}}],
            "ORDER": {"keys": ["courseAverage", "courses_id", "courses_dept"]},
            "AS": "TABLE"
        };

        let isValid = controller.isValid(query);
        expect(isValid).to.equal(false);
    });

    it("Should be able to sort course depts in ascending order", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg"],
            "WHERE": {
                "OR": [
                    {"EQ": {"courses_dept": 'adhe'}},
                    {"LT": {"courses_avg": 69}}
                ]
            },
            "ORDER": {"dir": "UP", "keys": ["courses_dept"]},
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_dept: 'adhe', courses_avg: 78.91},
                        {courses_dept: 'adhe', courses_avg: 78.91},
                        {courses_dept: 'asia', courses_avg: 68.85},
                        {courses_dept: 'asia', courses_avg: 68.85},
                        {courses_dept: 'asia', courses_avg: 64.3},
                        {courses_dept: 'asia', courses_avg: 64.3},
                        {courses_dept: 'cpsc', courses_avg: 68.07},
                        {courses_dept: 'cpsc', courses_avg: 68.89},
                        {courses_dept: 'cpsc', courses_avg: 68.94},
                        {courses_dept: 'cpsc', courses_avg: 67.76},
                        {courses_dept: 'cpsc', courses_avg: 68.77}]
                }
            });
        });
    });

    it("Should be able to sort course depts in descending order", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg"],
            "WHERE": {
                "OR": [
                    {"EQ": {"courses_dept": 'adhe'}},
                    {"LT": {"courses_avg": 69}}
                ]
            },
            "ORDER": {"dir": "DOWN", "keys": ["courses_dept"]},
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_dept: 'cpsc', courses_avg: 68.07},
                        {courses_dept: 'cpsc', courses_avg: 68.89},
                        {courses_dept: 'cpsc', courses_avg: 68.94},
                        {courses_dept: 'cpsc', courses_avg: 67.76},
                        {courses_dept: 'cpsc', courses_avg: 68.77},
                        {courses_dept: 'asia', courses_avg: 68.85},
                        {courses_dept: 'asia', courses_avg: 68.85},
                        {courses_dept: 'asia', courses_avg: 64.3},
                        {courses_dept: 'asia', courses_avg: 64.3},
                        {courses_dept: 'adhe', courses_avg: 78.91},
                        {courses_dept: 'adhe', courses_avg: 78.91}]
                }
            });
        });
    });

    it("Should be able to sort ascending by two ORDER keys", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg"],
            "WHERE": {
                "OR": [
                    {"EQ": {"courses_dept": 'adhe'}},
                    {"LT": {"courses_avg": 69}}
                ]
            },
            "ORDER": {"dir": "UP", "keys": ["courses_dept", "courses_avg"]},
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_dept: 'adhe', courses_avg: 78.91},
                        {courses_dept: 'adhe', courses_avg: 78.91},
                        {courses_dept: 'asia', courses_avg: 64.3},
                        {courses_dept: 'asia', courses_avg: 64.3},
                        {courses_dept: 'asia', courses_avg: 68.85},
                        {courses_dept: 'asia', courses_avg: 68.85},
                        {courses_dept: 'cpsc', courses_avg: 67.76},
                        {courses_dept: 'cpsc', courses_avg: 68.07},
                        {courses_dept: 'cpsc', courses_avg: 68.77},
                        {courses_dept: 'cpsc', courses_avg: 68.89},
                        {courses_dept: 'cpsc', courses_avg: 68.94}]
                }
            });
        });
    });

    it("Should be able to sort descending by two ORDER keys", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg"],
            "WHERE": {
                "OR": [
                    {"EQ": {"courses_dept": 'adhe'}},
                    {"LT": {"courses_avg": 69}}
                ]
            },
            "ORDER": {"dir": "DOWN", "keys": ["courses_dept", "courses_avg"]},
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_dept: 'cpsc', courses_avg: 68.94},
                        {courses_dept: 'cpsc', courses_avg: 68.89},
                        {courses_dept: 'cpsc', courses_avg: 68.77},
                        {courses_dept: 'cpsc', courses_avg: 68.07},
                        {courses_dept: 'cpsc', courses_avg: 67.76},
                        {courses_dept: 'asia', courses_avg: 68.85},
                        {courses_dept: 'asia', courses_avg: 68.85},
                        {courses_dept: 'asia', courses_avg: 64.3},
                        {courses_dept: 'asia', courses_avg: 64.3},
                        {courses_dept: 'adhe', courses_avg: 78.91},
                        {courses_dept: 'adhe', courses_avg: 78.91}]
                }
            });
        });
    });

    it("Should be able to sort ascending by multiple ORDER keys", function () {
        query = {
            "GET": ["courses_id", "courses_instructor", "courses_uuid"],
            "WHERE": {
                "IS": {"courses_instructor": '*er*'}
            },
            "ORDER": {"dir": 'UP', "keys": ["courses_id", "courses_instructor", "courses_uuid"]},
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_id: "315", courses_instructor: "nosco, peter", courses_uuid: 28951},
                        {courses_id: "315", courses_instructor: "nosco, peter", courses_uuid: 57511},
                        {courses_id: "317", courses_instructor: "baker, donald leslie", courses_uuid: 675},
                        {courses_id: "317", courses_instructor: "lovins, christopher", courses_uuid: 44016},
                        {courses_id: "320", courses_instructor: "meyer, irmtraud margret", courses_uuid: 3042},
                        {courses_id: "320", courses_instructor: "meyer, irmtraud margret", courses_uuid: 59658},
                        {courses_id: "320", courses_instructor: "schroeder, jonatan", courses_uuid: 42213},
                        {courses_id: "328", courses_instructor: "chan, jennifer", courses_uuid: 39622}]
                }
            });
        });
    });

    it("Should be able to sort descending by multiple ORDER keys", function () {
        query = {
            "GET": ["courses_id", "courses_instructor", "courses_uuid"],
            "WHERE": {
                "IS": {"courses_instructor": '*er*'}
            },
            "ORDER": {"dir": 'DOWN', "keys": ["courses_id", "courses_instructor", "courses_uuid"]},
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_id: "328", courses_instructor: "chan, jennifer", courses_uuid: 39622},
                        {courses_id: "320", courses_instructor: "schroeder, jonatan", courses_uuid: 42213},
                        {courses_id: "320", courses_instructor: "meyer, irmtraud margret", courses_uuid: 59658},
                        {courses_id: "320", courses_instructor: "meyer, irmtraud margret", courses_uuid: 3042},
                        {courses_id: "317", courses_instructor: "lovins, christopher", courses_uuid: 44016},
                        {courses_id: "317", courses_instructor: "baker, donald leslie", courses_uuid: 675},
                        {courses_id: "315", courses_instructor: "nosco, peter", courses_uuid: 57511},
                        {courses_id: "315", courses_instructor: "nosco, peter", courses_uuid: 28951}]
                }
            });
        });
    });

    it("Example like query 1", function () {
        query = {
            "GET": ["courses_dept", "courses_id", "courseAverage"],
            "WHERE": {"IS": {"courses_dept": "a*"}},
            "GROUP": ["courses_dept", "courses_id"],
            "APPLY": [{"courseAverage": {"AVG": "courses_avg"}}],
            "ORDER": {"dir": "UP", "keys": ["courseAverage", "courses_dept"]},
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (ret: InsightResponse) {
            //Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [{"courses_dept": 'asia', "courses_id": '317', "courseAverage": 69.5},
                        {"courses_dept": 'asia', "courses_id": '315', "courseAverage": 74.79},
                        {"courses_dept": 'adhe', "courses_id": '328', "courseAverage": 78.91}]
                }
            });
        });
    });

    it("Example like query 2", function () {
        query = {
            "GET": ["courses_dept", "courses_id", "courseAverage", "maxFail"],
            "WHERE": {},
            "GROUP": ["courses_dept", "courses_id"],
            "APPLY": [{"courseAverage": {"AVG": "courses_avg"}}, {"maxFail": {"MAX": "courses_fail"}}],
            "ORDER": {"dir": "UP", "keys": ["courseAverage", "maxFail", "courses_dept", "courses_id"]},
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (ret: InsightResponse) {
            //Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE',
                    result: [{"courses_dept": 'asia', "courses_id": '317', "courseAverage": 69.5, "maxFail": 2},
                        {"courses_dept": 'cpsc', "courses_id": '320', "courseAverage": 70.61, "maxFail": 31},
                        {"courses_dept": 'asia', "courses_id": '315', "courseAverage": 74.79, "maxFail": 2},
                        {"courses_dept": 'adhe', "courses_id": '328', "courseAverage": 78.91, "maxFail": 0}
                    ]
                }
            });
        });
    });

    it("Example like query 3", function () {
        query = {
            "GET": ["courses_dept", "courses_id", "numSections"],
            "WHERE": {},
            "GROUP": ["courses_dept", "courses_id"],
            "APPLY": [{"numSections": {"COUNT": "courses_uuid"}}],
            "ORDER": {"dir": "UP", "keys": ["numSections", "courses_dept", "courses_id"]},
            "AS": "TABLE"
        }
        ;

        return facade.performQuery(query).then(function (ret: InsightResponse) {
            //Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {"courses_dept": 'adhe', "courses_id": '328', "numSections": 2},
                        {"courses_dept": 'asia', "courses_id": '317', "numSections": 8},
                        {"courses_dept": 'asia', "courses_id": '315', "numSections": 12},
                        {"courses_dept": 'cpsc', "courses_id": '320', "numSections": 23}]
                }
            });
        });
    });

    it("Moonshine", function () {
        query = {
            "GET": ["courses_id", "courses_dept", "numSections", "gradeAverage", "countPassed", "avgFailing"],
            "WHERE": {
                "IS": {"courses_dept": "asia"}
            },
            "GROUP": ["courses_id", "courses_dept"],
            "APPLY": [{"numSections": {"COUNT": "courses_uuid"}},
                        {"gradeAverage": {"AVG": "courses_avg"}},
                {"countPassed": {"COUNT": "courses_pass"}},
                         {"avgFailing": {"AVG": "courses_fail"}}],
            "ORDER": {"dir": "DOWN", "keys": ["courses_id"]},
            "AS": "TABLE"
        }
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            //Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {"courses_id": "317", "courses_dept": "asia", "numSections": 8, "gradeAverage": 69.5, "countPassed": 4, "avgFailing": 1.5},
                        {"courses_id": "315", "courses_dept": "asia", "numSections": 12, "gradeAverage": 74.79, "countPassed": 6, "avgFailing": 0.67}]
                }
            });
        });
    });

    it("Nautilus", function () {
        query = {
            "GET": ["courses_id", "courses_dept", "minFail", "maxAudit"],
            "WHERE": {
                "IS": {"courses_id": "*1*"}
            },
            "GROUP": ["courses_id", "courses_dept"],
            "APPLY": [{"minFail": {"MIN": "courses_fail"}},
                    {"maxAudit": {"MAX": "courses_audit"}}],
            "AS": "TABLE"
        }
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            //Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {"courses_id": "315", "courses_dept": "asia", "minFail": 0, "maxAudit": 1},
                        {"courses_id": "317", "courses_dept": "asia", "minFail": 1, "maxAudit": 1}]
                }
            });
        });
    });

    var listOfDepts = [
        {courses_dept: 'adhe'},
        {courses_dept: 'adhe'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'asia'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'},
        {courses_dept: 'cpsc'}];

})
;
