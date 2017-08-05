/**
 * Created by rtholmes on 2016-10-31.
 */

import {Datasets, default as DatasetController} from "../src/controller/DatasetController";
import QueryController from "../src/controller/QueryController";
import {QueryRequest} from "../src/controller/QueryController";
import InsightFacade from "../src/controller/InsightFacade";
import {InsightResponse} from "../src/controller/InsightFacade";
import Log from "../src/Util";
import JSZip = require('jszip');

import {expect} from 'chai';


describe("D1Query", function () {


    let facade: InsightFacade;
    let query: QueryRequest;

    before(function () {
        facade = new InsightFacade();

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
                facade.addDataset('courses', data);     // add data to memory using dataset[key] ??
            })
            .catch(function (err) {
                Log.trace('before fn test ' + err);
            })
    });

    beforeEach(function () {

    });

    after(function () {
        facade.removeDataset('courses');
    });


    // QUERY VALIDATION TESTS

    it("Should be able to validate a simple valid query", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        let query = {
            "GET": ["courses_dept", "courses_avg"],
            "WHERE": {
                "GT": {
                    "courses_avg": 90
                }
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };

        let isValid = controller.isValid(query);
        expect(isValid).to.equal(true);
    });

    it("Should reject query without GET", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        let badQuery = {
            "WHERE": {
                "GT": {
                    "courses_avg": 90
                }
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };

        let isValid = controller.isValid(<any>badQuery);
        expect(isValid).to.equal(false);
        return facade.performQuery(<any>badQuery).then(function (ret) {
            expect.fail();
        }).catch(function (ret: InsightResponse) {
            expect(ret).to.eql({code: 400, body: {error: 'Invalid query'}});
        });
    });

    it("Should reject query without AS", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        let badQuery = {
            "GET": ["courses_dept", "courses_avg"],
            "WHERE": {
                "GT": {
                    "courses_avg": 90
                }
            },
            "ORDER": "courses_avg"
        };

        let isValid = controller.isValid(<any>badQuery);
        expect(isValid).to.equal(false);
        return facade.performQuery(<any>badQuery).then(function (ret) {
            expect.fail();
        }).catch(function (ret: InsightResponse) {
            expect(ret).to.eql({code: 400, body: {error: 'Invalid query'}});
        });
    });

    it("Should reject query without WHERE", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        let badQuery = {
            "GET": ["courses_dept", "courses_avg"],
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };

        let isValid = controller.isValid(<any>badQuery);
        expect(isValid).to.equal(false);
        return facade.performQuery(<any>badQuery).then(function (ret) {
            expect.fail();
        }).catch(function (ret: InsightResponse) {
            expect(ret).to.eql({code: 400, body: {error: 'Invalid query'}});
        });
    });

    it("Should reject query ORDERed by string key not in GET", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        let badQuery = {
            "GET": ["courses_dept"],
            "WHERE": {
                "GT": {
                    "courses_avg": 90
                }
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };

        let isValid = controller.isValid(<any>badQuery);
        expect(isValid).to.equal(false);
        return facade.performQuery(<any>badQuery).then(function (ret) {
            expect.fail();
        }).catch(function (ret: InsightResponse) {
            expect(ret).to.eql({code: 400, body: {error: 'Invalid query'}});
        });
    });

    it("Should not be able to submit an empty query", function () {         // do we need to test for null/undef values also?
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        let emptyQuery = {};

        let isValid = controller.isValid(<any>emptyQuery);
        expect(isValid).to.equal(false);
        return facade.performQuery(<any>emptyQuery).then(function (ret) {
            expect.fail();
        }).catch(function (ret: InsightResponse) {
            expect(ret).to.eql({code: 400, body: {error: 'Invalid query'}});
        });
    });

    it("Should be able to validate a complex valid query", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id", "courses_avg"],
            "WHERE": {
                "OR": [
                    {
                        "AND": [
                            {"GT": {"courses_avg": 70}},
                            {"IS": {"courses_dept": "adhe"}}
                        ]
                    },
                    {"EQ": {"courses_avg": 90}}
                ]
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };
        let isValid = controller.isValid(query);
        expect(isValid).to.equal(true);

    });

    it("Should be able to invalidate a null query", function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        let query: any = null;
        let isValid = controller.isValid(query);
        expect(isValid).to.equal(false);
        return facade.performQuery(<any>query).then(function (ret) {
            expect.fail();
        }).catch(function (ret: InsightResponse) {
            expect(ret).to.eql({code: 400, body: {error: 'Invalid query'}});
        });
    });

    it("Fester: a query referencing an invalid dataset from a deep WHERE should result in 424", function () {

        let query: QueryRequest = {
            "GET": ["courses_id", "courses_dept"],
            "WHERE": {
                "OR": [
                    {
                        "AND": [
                            {"IS": {"courses_dept": "a*"}},
                            {"GT": {"courses_avg": 74}},
                            {"NOT": {"IS": {"apples_instructor": "*war*"}}}
                        ]
                    },
                    {"IS": {"courses_id": "317"}}
                ]
            },
            "ORDER": "courses_id",
            "AS": "TABLE"
        };
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            expect.fail();
        }).catch(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret.code).to.equal(424);
        });
    });

    it("424 response body should list all missing dataset ids with no duplicates", function () {

        let query: QueryRequest = {
            "GET": ["courses_id", "courses_dept", "another_id"],
            "WHERE": {
                "OR": [
                    {
                        "AND": [
                            {"IS": {"courses_dept": "a*"}},
                            {"GT": {"courses_avg": 74}},
                            {
                                "NOT": {
                                    "OR": [
                                        {"IS": {"apples_instructor": "*war*"}},
                                        {"EQ": {"another_dept": "cpsc"}},
                                        {"EQ": {"oranges_dept": "cpsc"}},
                                        {"GT": {"apples_avg": 50}}]
                                }
                            }
                        ]
                    },
                    {"IS": {"courses_id": "317"}}
                ]
            },
            "ORDER": "courses_id",
            "AS": "TABLE"
        };
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            expect.fail();
        }).catch(function (ret: InsightResponse) {
            //Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret.code).to.equal(424);
            Log.test(JSON.stringify(ret.body));
            expect(ret.body).to.eql({"missing": ["another", "apples", "oranges"]});
        });

    });


    // QUERY TESTS


    it("Should be able to query, although the answer will be empty", function () {

        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id", "courses_avg"],
            "WHERE": {
                "EQ": {"courses_avg": 150}
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({code: 200, body: {render: query['AS'], result: []}});
        })
    });


    it("Should be able to perform GT mathematical query", function () {

        let query: QueryRequest = {
            "GET": ["courses_id", "courses_avg"],
            "WHERE": {
                "GT": {"courses_avg": 76}
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_id: '315', courses_avg: 76.6},
                        {courses_id: '315', courses_avg: 76.6},
                        {courses_id: '315', courses_avg: 77.48},
                        {courses_id: '315', courses_avg: 77.48},
                        {courses_id: '328', courses_avg: 78.91},
                        {courses_id: '328', courses_avg: 78.91}]
                }
            });
        });
    });

    it("Should be able to perform NOT query", function () {

        let query: QueryRequest = {
            "GET": ["courses_id", "courses_avg"],
            "WHERE": {
                "NOT": {
                    "LT": {"courses_avg": 76}
                }
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_id: '315', courses_avg: 76.6},
                        {courses_id: '315', courses_avg: 76.6},
                        {courses_id: '315', courses_avg: 77.48},
                        {courses_id: '315', courses_avg: 77.48},
                        {courses_id: '328', courses_avg: 78.91},
                        {courses_id: '328', courses_avg: 78.91}]
                }
            });
        });
    });

    it("Should be able to perform NOT GT query", function () {

        let query: QueryRequest = {
            "GET": ["courses_id", "courses_dept"],
            "WHERE": {
                "NOT": {
                    "GT": {"courses_dept": "adhe"}
                }
            },
            "ORDER": "courses_dept",
            "AS": "TABLE"
        };
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [{courses_id: '328', courses_dept: "adhe"},
                        {courses_id: '328', courses_dept: "adhe"},]
                }
            });
        });
    });

    it("Should be able to perform NOT AND query", function () {

        let query: QueryRequest = {
            "GET": ["courses_id", "courses_dept"],
            "WHERE": {
                "NOT": {
                    "AND": [
                        {"IS": {"courses_id": "315"}},
                        {"IS": {"courses_dept": "cpsc"}}]
                }
            },
            "ORDER": "courses_dept",
            "AS": "TABLE"
        };
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_id: '328', courses_dept: "adhe"},
                        {courses_id: '328', courses_dept: "adhe"},
                        {courses_id: '317', courses_dept: "asia"},
                        {courses_id: '317', courses_dept: "asia"},
                        {courses_id: '317', courses_dept: "asia"},
                        {courses_id: '317', courses_dept: "asia"},
                        {courses_id: '317', courses_dept: "asia"},
                        {courses_id: '317', courses_dept: "asia"},
                        {courses_id: '317', courses_dept: "asia"},
                        {courses_id: '317', courses_dept: "asia"},
                        {courses_id: '315', courses_dept: "asia"},
                        {courses_id: '315', courses_dept: "asia"},
                        {courses_id: '315', courses_dept: "asia"},
                        {courses_id: '315', courses_dept: "asia"},
                        {courses_id: '315', courses_dept: "asia"},
                        {courses_id: '315', courses_dept: "asia"},
                        {courses_id: '315', courses_dept: "asia"},
                        {courses_id: '315', courses_dept: "asia"},
                        {courses_id: '315', courses_dept: "asia"},
                        {courses_id: '315', courses_dept: "asia"},
                        {courses_id: '315', courses_dept: "asia"},
                        {courses_id: '315', courses_dept: "asia"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"},
                        {courses_id: '320', courses_dept: "cpsc"}
                        ]
                }
            });
        });
    });


    it("Should be able to sort results by course_dept", function () {

        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg"],
            "WHERE": {
                "OR": [
                    {"EQ": {"courses_dept": "adhe"}},
                    {"LT": {"courses_avg": 69}}
                ]
            },
            "ORDER": "courses_dept",
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


    it("Should be able to perform IS query", function () {

        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id", "courses_avg"],
            "WHERE": {
                "IS": {"courses_dept": "adhe"}
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.info('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_dept: 'adhe', courses_id: "328", courses_avg: 78.91},
                        {courses_dept: 'adhe', courses_id: "328", courses_avg: 78.91}]
                }
            });
        });
    });

    it("Should be able to perform EQ query", function () {

        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id"],
            "WHERE": {
                "EQ": {"courses_id": 315}
            },
            "ORDER": "courses_dept",
            "AS": "TABLE"
        };
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.warn('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"}]
                }
            });
        });
    });

    it("Should be able to perform EQ query with RegExp", function () {

        let query: QueryRequest = {
            "GET": ["courses_id", "courses_instructor"],
            "WHERE": {
                "IS": {"courses_instructor": "*er*"}
            },
            "ORDER": "courses_instructor",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_id: "317", courses_instructor: "baker, donald leslie"},
                        {courses_id: "328", courses_instructor: "chan, jennifer"},
                        {courses_id: "317", courses_instructor: "lovins, christopher"},
                        {courses_id: "320", courses_instructor: "meyer, irmtraud margret"},
                        {courses_id: "320", courses_instructor: "meyer, irmtraud margret"},
                        {courses_id: "315", courses_instructor: "nosco, peter"},
                        {courses_id: "315", courses_instructor: "nosco, peter"},
                        {courses_id: "320", courses_instructor: "schroeder, jonatan"}]
                }
            });
        });
    });

    it("Should be able to perform EQ query with RegExp2", function () {

        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id"],
            "WHERE": {
                "IS": {"courses_dept": '*a'}
            },
            "ORDER": "courses_dept",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "317"},
                        {courses_dept: 'asia', courses_id: "317"},
                        {courses_dept: 'asia', courses_id: "317"},
                        {courses_dept: 'asia', courses_id: "317"},
                        {courses_dept: 'asia', courses_id: "317"},
                        {courses_dept: 'asia', courses_id: "317"},
                        {courses_dept: 'asia', courses_id: "317"},
                        {courses_dept: 'asia', courses_id: "317"},
                    ]
                }
            });
        });
    });

    it("Nested NOTs should cancel each other out", function () {

        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id"],
            "WHERE": {
                "NOT": {
                    "NOT": {
                        "EQ": {"courses_id": '315'}
                    }
                }
            },
            "ORDER": "courses_id",
            "AS": "TABLE"
        };
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"},
                        {courses_dept: 'asia', courses_id: "315"}]
                }
            });
        });
    });


    it("Should be able to perform logic query with multiple filters", function () {

        let query: QueryRequest = {
            "GET": ["courses_id", "courses_instructor"],
            "WHERE": {
                "OR": [
                    {
                        "AND": [
                            {"EQ": {"courses_id": 315}},
                            {"EQ": {"courses_avg": 74.73}}
                        ]
                    },
                    {"IS": {"courses_instructor": "*park*"}}
                ]
            },
            "ORDER": "courses_id",
            "AS": "TABLE"
        };
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_id: "315", courses_instructor: "fujiwara, gideon"},
                        {courses_id: "315", courses_instructor: ""},
                        {courses_id: "317", courses_instructor: "park, jeongeun"}]
                }
            });
        });
    });

    it("Should be able to perform logic query with more stuff", function () {

        let query: QueryRequest = {
            "GET": ["courses_id", "courses_dept"],
            "WHERE": {
                "OR": [
                    {
                        "AND": [
                            {"IS": {"courses_dept": 'a*'}},
                            {"GT": {"courses_avg": 74}},
                            {"NOT": {"IS": {"courses_instructor": "*war*"}}}
                        ]
                    },
                    {"IS": {"courses_id": '317'}}
                ]
            },
            "ORDER": "courses_id",
            "AS": "TABLE"
        };
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: [
                        {courses_id: "315", courses_dept: "asia"},
                        {courses_id: "315", courses_dept: "asia"},
                        {courses_id: "315", courses_dept: "asia"},
                        {courses_id: "315", courses_dept: "asia"},
                        {courses_id: "315", courses_dept: "asia"},
                        {courses_id: "315", courses_dept: "asia"},
                        {courses_id: "315", courses_dept: "asia"},
                        {courses_id: "315", courses_dept: "asia"},
                        {courses_id: "315", courses_dept: "asia"},
                        {courses_id: "317", courses_dept: "asia"},
                        {courses_id: "317", courses_dept: "asia"},
                        {courses_id: "317", courses_dept: "asia"},
                        {courses_id: "317", courses_dept: "asia"},
                        {courses_id: "317", courses_dept: "asia"},
                        {courses_id: "317", courses_dept: "asia"},
                        {courses_id: "317", courses_dept: "asia"},
                        {courses_id: "317", courses_dept: "asia"},
                        {courses_id: "328", courses_dept: "adhe"},
                        {courses_id: "328", courses_dept: "adhe"}]
                }
            });
        });
    });

    it("Public suite failing query test", function () {

        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id", "courses_avg"],
            "WHERE": {
                "AND": [
                    {"IS": {"courses_dept": "cpsc"}},
                    {"EQ": {"courses_id": "310"}}
                ]
            },
            "AS": "TABLE"
        };
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
            expect(ret).to.eql({
                code: 200, body: {
                    render: 'TABLE', result: []
                }
            });
        });
    });

    it("Should recognize 'courses_uuid' as valid key", function () {
        var that = this;
        Log.trace("Starting test: " + that.test.title);
        let query: QueryRequest = {
            "GET": ["courses_id", "courses_uuid"],
            "WHERE": {
                "IS": {"courses_id": '328'}
            },
            "ORDER": "courses_uuid",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (ret: InsightResponse) {
            expect(ret.code).to.equal(200);
            expect(ret.body).to.eql({
                render: 'TABLE', result: [
                    {courses_id: '328', courses_uuid: 39622},
                    {courses_id: '328', courses_uuid: 39623}]
            });
        });
    });

    it("Should be able to do query that uses courses_title", function () {
        let query = {
            "GET": ["courses_dept", "courses_title"],
            "WHERE": {
                "IS": {
                    "courses_dept": 'adhe'
                }
            },
            "ORDER": "courses_dept",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (ret: InsightResponse) {
            expect(ret.body).to.eql({
                render: 'TABLE', result: [
                    {courses_dept: 'adhe', courses_title: "inst adul educ"},
                    {courses_dept: 'adhe', courses_title: "inst adul educ"}]
            });
        });
    });

    it("Should allow WHERE to be empty {}", function () {
        let query = {
            "GET": ["courses_dept"],
            "WHERE": {},
            "ORDER": "courses_dept",
            "AS": "TABLE"
        };

        //Log.test('Disk contains dataset?' + facade.dataController.diskContainsDataset('courses'));
        //Log.test('Mem contains dataset?' + facade.dataController.memoryContainsDataset('courses'));
        return facade.performQuery(query).then(function (ret: InsightResponse) {
            expect(ret.body).to.eql({render: 'TABLE', result: listOfDepts});
            expect(ret.code).to.equal(200);
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