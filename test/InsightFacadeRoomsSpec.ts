/**
 * Created by Kirsten on 2016-11-06.
 */

/**
 * Created by rtholmes on 2016-10-04.
 */

import fs = require('fs');
import Log from "../src/Util";
import {expect} from 'chai';
import InsightFacade from "../src/controller/InsightFacade";
import {InsightResponse} from "../src/controller/InsightFacade";
import JSZip = require('jszip');

describe("InsightFacadeRooms", function () {

    var zipFileContents: string = null;
    var facade: InsightFacade = null;

    before(function () {
        Log.info('InsightController::before() - start');
        // this zip might be in a different spot for you
        zipFileContents = new Buffer(fs.readFileSync(__dirname + '/310rooms.1.1.zip')).toString('base64');
        try {
            // what you delete here is going to depend on your impl, just make sure
            // all of your temporary files and directories are deleted
            fs.unlinkSync('./id.json');
        } catch (err) {
            // silently fail, but don't crash; this is fine
            Log.warn('InsightController::before() - id.json not removed (probably not present)');
        }
        Log.info('InsightController::before() - done');
    });

    beforeEach(function () {
        facade = new InsightFacade();
    });

    after(function () {
        facade.removeDataset('rooms');
    });

    it.only("Should be able to add a add a new dataset (204)", function () {
        var that = this;
        Log.trace("Starting test: " + that.test.title);
        return facade.addDataset('rooms', zipFileContents).then(function (response: InsightResponse) {
            expect(response.code).to.equal(204);
        }).catch(function (response: InsightResponse) {
            expect.fail('Should not happen');
        });
    });

    it("Should be able to update an existing dataset (201)", function () {
        var that = this;
        Log.trace("Starting test: " + that.test.title);
        return facade.addDataset('rooms', zipFileContents).then(function (response: InsightResponse) {
            Log.trace('response: ' + JSON.stringify(response));
            expect(response.code).to.equal(201);
        }).catch(function (response: InsightResponse) {
            expect.fail('Should not happen');
        });
    });

    it("Should not be able to add an invalid dataset (400)", function () {
        var that = this;
        Log.trace("Starting test: " + that.test.title);
        return facade.addDataset('rooms', 'some random bytes').then(function (response: InsightResponse) {
            expect.fail();
        }).catch(function (response: InsightResponse) {
            expect(response.code).to.equal(400);
            Log.test('response body: ' + JSON.stringify(response.body));
        });
    });

    it("Should reject zip with invalid file path/structure", function () {
        var zip = new JSZip;
        var dataPath = __dirname.split('/test')[0] + '/data/roomData/';

        zip.file('index.htm', fs.readFileSync(dataPath + 'index.htm'))
            .folder('campus')
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
            return facade.addDataset('rooms', data).then(function (response: InsightResponse) {
                expect.fail();
            }).catch(function (response: InsightResponse) {
                expect(response.code).to.equal(400);
                Log.test('response body: ' + JSON.stringify(response.body));
            });
        });
    });

    it("Should reject zip that contains no valid data", function () {
        var zip = new JSZip;
        var dataPath = __dirname.split('/test')[0] + '/data/roomData/';

        zip.folder('campus')
            .folder('discover')
            .folder('buildings-and-classrooms');
        const opts = {compression: 'deflate', compressionOptions: {level: 2}, type: 'base64'};
        return zip.generateAsync(opts).then(function (data: any) {
            return facade.addDataset('rooms', data).then(function (response: InsightResponse) {
                expect.fail();
            }).catch(function (response: InsightResponse) {
                expect(response.code).to.equal(400);
                Log.test('response body: ' + JSON.stringify(response.body));
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
                    result: [{rooms_shortname: 'ANGU', numRooms: 1},
                        {rooms_shortname: 'BIOL', numRooms: 1},
                        {rooms_shortname: 'BUCH', numRooms: 2},
                        {rooms_shortname: 'CHBE', numRooms: 1},
                        {rooms_shortname: 'CHEM', numRooms: 2},
                        {rooms_shortname: 'CIRS', numRooms: 1},
                        {rooms_shortname: 'ESB', numRooms: 1},
                        {rooms_shortname: 'FSC', numRooms: 1},
                        {rooms_shortname: 'GEOG', numRooms: 1},
                        {rooms_shortname: 'HEBB', numRooms: 1},
                        {rooms_shortname: 'HENN', numRooms: 1},
                        {rooms_shortname: 'LSC', numRooms: 2},
                        {rooms_shortname: 'LSK', numRooms: 2},
                        {rooms_shortname: 'MATH', numRooms: 1},
                        {rooms_shortname: 'MCML', numRooms: 1},
                        {rooms_shortname: 'OSBO', numRooms: 1},
                        {rooms_shortname: 'PHRM', numRooms: 2},
                        {rooms_shortname: 'SCRF', numRooms: 1},
                        {rooms_shortname: 'SRC', numRooms: 3},
                        {rooms_shortname: 'SWNG', numRooms: 4},
                        {rooms_shortname: 'WESB', numRooms: 1},
                        {rooms_shortname: 'WOOD', numRooms: 2}]
                }
            );
        });
    });

    it('Should be able to list rooms with moveable tables in a bounding box', function () {
        let query = {
            "GET": ["rooms_fullname", "rooms_number", "rooms_seats"],
            "WHERE": {
                "AND": [
                    {"GT": {"rooms_lat": 49.261292}},
                    {"LT": {"rooms_lon": -123.245214}},
                    {"LT": {"rooms_lat": 49.262966}},
                    {"GT": {"rooms_lon": -123.249886}},
                    {"IS": {"rooms_furniture": "*Movable Tables*"}}
                ]
            },
            "ORDER": {"dir": "UP", "keys": ["rooms_number"]},
            "AS": "TABLE"
        };

        return facade.performQuery(query).then(function (resp: InsightResponse) {
            expect(resp.code).to.equal(200);
            expect(resp.body).to.eql({
                    render: 'TABLE',
                    result: [{
                        rooms_fullname: 'Chemical and Biological Engineering Building',
                        rooms_number: '103',
                        rooms_seats: 60
                    },
                        {
                            rooms_fullname: 'Civil and Mechanical Engineering',
                            rooms_number: '1206',
                            rooms_seats: 26
                        },
                        {
                            rooms_fullname: 'Civil and Mechanical Engineering',
                            rooms_number: '1210',
                            rooms_seats: 22
                        },
                        {
                            rooms_fullname: 'MacLeod',
                            rooms_number: '214',
                            rooms_seats: 60
                        },
                        {
                            rooms_fullname: 'MacLeod',
                            rooms_number: '220',
                            rooms_seats: 40
                        },
                        {
                            rooms_fullname: 'MacLeod',
                            rooms_number: '242',
                            rooms_seats: 60
                        },
                        {
                            rooms_fullname: 'MacLeod',
                            rooms_number: '254',
                            rooms_seats: 84
                        }]
                });
        });

    });
});