import InsightFacade from "../src/controller/InsightFacade";
import {QueryRequest, default as QueryController} from "../src/controller/QueryController";
import {Datasets, RoomData} from "../src/controller/DatasetController";
import JSZip = require('jszip');
import {expect} from 'chai';
import {InsightResponse} from "../src/controller/InsightFacade";
import Log from "../src/Util";
import {ASTNode} from "parse5";
import HTMLParser from "../src/tools/HTMLParser";
/**
 * Created by Kirsten on 2016-11-02.
 */

describe("RoomsQueryController", function () {

    let facade: InsightFacade;
    var zip: JSZip;
    //var data: any;
    let query: QueryRequest;

    before(function () {

        var fs = require('fs');
        var dataPath = __dirname.split('/test')[0] + '/data/roomData/';       // will this work across systems?

        facade = new InsightFacade();
        zip = new JSZip;
        zip.file('index.htm', fs.readFileSync(dataPath + 'index.htm'))
            .folder('campus')
            .folder('discover')
            .folder('buildings-and-classrooms')
            .file('ALRD.html', fs.readFileSync(dataPath + 'ALRD.html'))
            .file('ANSO', fs.readFileSync(dataPath + 'ANSO'))
            .file('CHAN', fs.readFileSync(dataPath + 'CHAN'))
            .file('CEME', fs.readFileSync(dataPath + 'CEME'))
            .file('CHBE', fs.readFileSync(dataPath + 'CHBE'))
            .file('DMP', fs.readFileSync(dataPath + 'DMP'))
            .file('MCLD', fs.readFileSync(dataPath + 'MCLD'))
            .file('PHRM', fs.readFileSync(dataPath + 'PHRM'));
        const opts = {compression: 'deflate', compressionOptions: {level: 2}, type: 'base64'};
        return zip.generateAsync(opts).then(function (data: any) {
            return facade.addDataset('rooms', data);
        });
    });

    it('Should be able to validate simple query using rooms data', function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        let query = {
            "GET": ["rooms_fullname", "rooms_shortname"],
            "WHERE": {
                "GT": {
                    "rooms_sets": 90
                }
            },
            "ORDER": "rooms_shortname",
            "AS": "TABLE"
        };

        let isValid = controller.isValid(query);
        expect(isValid).to.equal(true);
    });

    it('Should be able to invalidate simple query using rooms data', function () {
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        let query = {
            "GET": ["rooms_fullname", "rooms_shortname"],
            "WHERE": {
                "GT": {
                    "rooms_sets": 90
                }
            },
            "ORDER": "rooms_sets",
            "AS": "TABLE"
        };

        let isValid = controller.isValid(query);
        expect(isValid).to.equal(false);
    });

    it('Should be able to invalidate simple rooms query with missing dataset', function () {
        let query = {
            "GET": ["room_fullname", "rooms_shortname"],
            "WHERE": {
                "GT": {
                    "rooms_sets": 90
                }
            },
            "ORDER": "rooms_shortname",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (resp: InsightResponse) {
            expect.fail('Should not happen');
        }).catch(function (resp: InsightResponse) {
            expect(resp.code).to.equal(424);
        })

    });

    it('Should be able to invalidate query with multiple datasets', function () {
        let query = {
            "GET": ["rooms_fullname", "rooms_shortname"],
            "WHERE": {
                "GT": {
                    "rooms_seats": 90
                }
            },
            "ORDER": "courses_uiid",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (resp: InsightResponse) {
            expect.fail('Should not happen');
        }).catch(function (resp: InsightResponse) {
            expect(resp.code).to.equal(400);
        })

    });

    it('Empty WHERE should return all results', function () {
        let query = {
            "GET": ["rooms_shortname"],
            "WHERE": {},
            "ORDER": "rooms_shortname",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (resp: InsightResponse) {
            expect(resp.code).to.equal(200);
            expect(resp.body).to.eql({
                render: 'TABLE',
                result: [
                    {rooms_shortname: 'ALRD'},
                    {rooms_shortname: 'ALRD'},
                    {rooms_shortname: 'ALRD'},
                    {rooms_shortname: 'ALRD'},
                    {rooms_shortname: 'ALRD'},
                    {rooms_shortname: 'ANSO'},
                    {rooms_shortname: 'ANSO'},
                    {rooms_shortname: 'ANSO'},
                    {rooms_shortname: 'ANSO'},
                    {rooms_shortname: 'CEME'},
                    {rooms_shortname: 'CEME'},
                    {rooms_shortname: 'CEME'},
                    {rooms_shortname: 'CEME'},
                    {rooms_shortname: 'CEME'},
                    {rooms_shortname: 'CEME'},
                    {rooms_shortname: 'CHBE'},
                    {rooms_shortname: 'CHBE'},
                    {rooms_shortname: 'CHBE'},
                    {rooms_shortname: 'DMP'},
                    {rooms_shortname: 'DMP'},
                    {rooms_shortname: 'DMP'},
                    {rooms_shortname: 'DMP'},
                    {rooms_shortname: 'DMP'},
                    {rooms_shortname: 'MCLD'},
                    {rooms_shortname: 'MCLD'},
                    {rooms_shortname: 'MCLD'},
                    {rooms_shortname: 'MCLD'},
                    {rooms_shortname: 'MCLD'},
                    {rooms_shortname: 'MCLD'},
                    {rooms_shortname: 'PHRM'},
                    {rooms_shortname: 'PHRM'},
                    {rooms_shortname: 'PHRM'},
                    {rooms_shortname: 'PHRM'},
                    {rooms_shortname: 'PHRM'},
                    {rooms_shortname: 'PHRM'},
                    {rooms_shortname: 'PHRM'},
                    {rooms_shortname: 'PHRM'},
                    {rooms_shortname: 'PHRM'},
                    {rooms_shortname: 'PHRM'},
                    {rooms_shortname: 'PHRM'}]
            });
        });

    });


    it('Should be able to find all rooms in DMP', function () {
        let query = {
            "GET": ["rooms_fullname", "rooms_number"],
            "WHERE": {"IS": {"rooms_shortname": "DMP"}},
            "ORDER": {"dir": "UP", "keys": ["rooms_number"]},
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (resp: InsightResponse) {
            expect(resp.code).to.equal(200);
            expect(resp.body).to.eql({
                    render: 'TABLE',
                    result: [{
                        rooms_fullname: 'Hugh Dempster Pavilion',
                        rooms_number: '101'
                    },
                        {
                            rooms_fullname: 'Hugh Dempster Pavilion',
                            rooms_number: '110'
                        },
                        {
                            rooms_fullname: 'Hugh Dempster Pavilion',
                            rooms_number: '201'
                        },
                        {
                            rooms_fullname: 'Hugh Dempster Pavilion',
                            rooms_number: '301'
                        },
                        {
                            rooms_fullname: 'Hugh Dempster Pavilion',
                            rooms_number: '310'
                        }]
                }
            )
        });

    });

    it('Should be able to count the number of rooms with > 160 seats in each building', function () {
        let query = {
            "GET": ["rooms_shortname", "numRooms"],
            "WHERE": {"GT": {"rooms_seats": 160}},
            "GROUP": ["rooms_shortname"],
            "APPLY": [{"numRooms": {"COUNT": "rooms_name"}}],
            "ORDER": "rooms_shortname",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (resp: InsightResponse) {
            expect(resp.code).to.equal(200);
            expect(resp.body).to.eql({
                    render: 'TABLE',
                    result: [
                        {rooms_shortname: 'CHBE', numRooms: 1},
                        {rooms_shortname: 'PHRM', numRooms: 2}]
                }
            )
        });
    });

    it('Should be able to do negated LT', function () {
        let query = {
            "GET": ["rooms_shortname", "numRooms"],
            "WHERE": {"NOT": {"LT": {"rooms_seats": 161}}},
            "GROUP": ["rooms_shortname"],
            "APPLY": [{"numRooms": {"COUNT": "rooms_name"}}],
            "ORDER": "rooms_shortname",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (resp: InsightResponse) {
            expect(resp.code).to.equal(200);
            expect(resp.body).to.eql({
                    render: 'TABLE',
                    result: [
                        {rooms_shortname: 'CHBE', numRooms: 1},
                        {rooms_shortname: 'PHRM', numRooms: 2}]
                }
            )
        });
    });

    it('Should be able to return rooms with number 202', function () {
        let query = {
            "GET": ["rooms_shortname", "rooms_number"],
            "WHERE": {"IS": {"rooms_number": "202"}},
            "ORDER": "rooms_shortname",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (resp: InsightResponse) {
            expect(resp.code).to.equal(200);
            expect(resp.body).to.eql({
                render: 'TABLE',
                result: [
                    {rooms_shortname: 'ANSO', rooms_number: "202"},
                    {rooms_shortname: 'MCLD', rooms_number: "202"}
                ]
            });
        });

    });

    it('Should be able to do not GT query', function () {
        let query = {
            "GET": ["rooms_shortname", "rooms_seats"],
            "WHERE": {"NOT": {"GT": {"rooms_seats": 21}}},
            "ORDER": "rooms_shortname",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (resp: InsightResponse) {
            expect(resp.code).to.equal(200);
            expect(resp.body).to.eql({
                render: 'TABLE',
                result: [
                    {rooms_shortname: 'ALRD', rooms_seats: 20},
                    {rooms_shortname: 'ALRD', rooms_seats: 20},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 14},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                ]
            });
        });

    });

    it('Should be able to do LT query', function () {
        let query = {
            "GET": ["rooms_shortname", "rooms_seats"],
            "WHERE": {"LT": {"rooms_seats": 21}},
            "ORDER": "rooms_shortname",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (resp: InsightResponse) {
            expect(resp.code).to.equal(200);
            expect(resp.body).to.eql({
                render: 'TABLE',
                result: [
                    {rooms_shortname: 'ALRD', rooms_seats: 20},
                    {rooms_shortname: 'ALRD', rooms_seats: 20},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 14},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7}
                ]
            });
        });
    });

    it('Should be able to do EQ query', function () {
        let query = {
            "GET": ["rooms_shortname", "rooms_seats"],
            "WHERE": {"EQ": {"rooms_seats": 7}},
            "ORDER": "rooms_shortname",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (resp: InsightResponse) {
            expect(resp.code).to.equal(200);
            expect(resp.body).to.eql({
                render: 'TABLE',
                result: [{rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7},
                    {rooms_shortname: 'PHRM', rooms_seats: 7}]
            });
        });
    });

    it('Should be able to do NOT EQ query', function () {
        let query = {
            "GET": ["rooms_shortname", "rooms_seats"],
            "WHERE": {"AND": [{"NOT": {"EQ": {"rooms_seats": 7}}},{"LT": {"rooms_seats": 21}}]},
            "ORDER": "rooms_shortname",
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (resp: InsightResponse) {
            expect(resp.code).to.equal(200);
            expect(resp.body).to.eql({
                render: 'TABLE',
                result: [
                    {rooms_shortname: 'ALRD', rooms_seats: 20},
                    {rooms_shortname: 'ALRD', rooms_seats: 20},
                    {rooms_shortname: 'PHRM', rooms_seats: 14},
                ]
            });
        });
    });


});