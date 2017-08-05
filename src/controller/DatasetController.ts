/**
 * Created by rtholmes on 2016-09-03.
 */

import Log from "../Util";
import JSZip = require('jszip');
import {ASTNode} from "parse5";
import ParserHelper from "../tools/ParserHelper";
import HTMLParser from "../tools/HTMLParser";


/**
 * In memory representation of all datasets.
 */
export interface Datasets {
    [id: string]: {};
}

export interface BldgData {
    abbr: string;
    fullName: string;
    address: string;
    lat: number;
    lon: number;
    roomData: ASTNode[];

}

export interface RoomData {
    fullname: string;
    shortname: string;
    number: string;
    name: string;
    address: string;
    lat: number;
    lon: number;
    seats: number;
    type: string;
    furniture: string;
    href: string;
}

export default class DatasetController {

    private datasets: Datasets = {};

    constructor() {
    }


    /**
     * Removes dataset corresponding to given id from local memory
     */
    public deleteDatasetInMemory(id: string): boolean {
        if (this.datasets[id] == null || this.datasets[id] == undefined) {
            return false;
        }
        else {
            delete this.datasets[id];
            return true;
        }
    }

    /**
     * Removes dataset corresponding to given id from its location on disk
     */
    public deleteDatasetOnDisk(id: string): boolean {
        var fs = require('fs');
        var dataPath = __dirname.split('/src')[0] + '/data/';       // will this work across systems?

        try {
            var shouldReturnUndefined = fs.unlinkSync(dataPath + id + '.json');
            return true;                                 // unlinkSync returns undefined
        }
        catch (err) {
            return false;
        }
    }

    public getDatasets(): Datasets {
        //let that = this;
        if (Object.keys(this.datasets).length === 0) {
            var fs = require('fs');
            var dataPath = __dirname.split('/src')[0] + '/data';       // will this work across systems?
            var files: string[] = fs.readdirSync(dataPath);
            for (var file of files) {
                if (fs.lstatSync(dataPath + '/' + file).isFile()) {              // check that file is file, not directory
                    var data: string = fs.readFileSync(dataPath + '/' + file, 'utf8').toString();

                    var fileName = file.split('.')[0];
                    var fileExtension = file.split('.')[1];

                    if (this.datasets[fileName] == null) {
                        try {
                            this.datasets[fileName] = JSON.parse(data);
                        }
                        catch (exc) {
                            //Log.trace('getDatasets: invalid JSON data in ' + fileName);
                            this.datasets[fileName] = data;
                        }
                    }
                }
                else {
                    Log.trace('not a file');
                }
            }

        }

        return this.datasets;
    }


    public memoryContainsDataset(id: string) {
        return (this.datasets[id] != null);
    }

    public diskContainsDataset(id: string) {
        var fs = require('fs');
        var pathToDataset = __dirname.split('src')[0] + 'data/' + id + '.json';
        return fs.existsSync(pathToDataset);
    }


    /**
     * Process the dataset; save it to disk when complete.
     *
     * @param id
     * @param data base64 representation of a zip file
     * @returns {Promise<boolean>} returns true if successful; false if the dataset was invalid (for whatever reason)
     */
    public process(id: string, data: any): Promise<number|string> {

        var IDIsNew: number;

        if (!this.memoryContainsDataset(id) && !this.diskContainsDataset(id)) {
            IDIsNew = 1;
            Log.trace('id ' + id + ' is new');
        }
        else {
            IDIsNew = 0;
            Log.trace('id ' + id + ' is not new');
        }

        if (id == 'courses') {
            return this.processCourseData(id, data, IDIsNew);
        }
        else if (id == 'rooms') {
            return this.processRoomsData(id, data, IDIsNew);
        }
    }


    public processCourseData(id: string, data: any, IDIsNew: number): Promise<number|string> {


        Log.trace('DatasetController::processCoursesData( ' + id + '... )');

        let that = this;

        var processedDataset: {[name: string]: Object|string} = {};
        var allPromises: any = [];
        return new Promise(function (fulfill, reject) {
                let myZip = new JSZip();
                return myZip.loadAsync(data, {base64: true})
                    .then(function (zip: JSZip) {
                        Log.trace('DatasetController::process(..) - unzipped');

                        if (id == 'courses') {
                            myZip.forEach(function (relativePath: string, file: JSZipObject) {
                                if (relativePath.split('/')[0] != id) {                 // unfair condition?
                                    return reject('Dataset structure is invalid');
                                }
                                else if (!file.dir) {
                                    var promise = file.async('string')
                                        .then(function success(content: string) {
                                            var pathComponents = relativePath.split('/');
                                            var asObj: any = JSON.parse(content);
                                            if (asObj['result'].length != 0) {
                                                var obj = JSON.parse(content);
                                                that.addCourseSize(obj);
                                                processedDataset[pathComponents[pathComponents.length - 1]] = obj;   // checks valid JSON format
                                            }
                                        }, function error(e: Error) {
                                            Log.error('process problem: ' + e.message);
                                            return reject(e.message);
                                        });
                                }

                                allPromises.push(promise);
                            });
                        }

                        Promise.all(allPromises).then(function () {
                            if (Object.keys(processedDataset).length == 0) {
                                return reject('Zip contains no valid data');
                            }
                            else {
                                that.save(id, processedDataset);
                                return fulfill(IDIsNew);
                            }
                        }).catch(function (err: Error) {
                            Log.error('DatasetController::process(..) - 4 ' + err.message + '');
                            return reject(err.message);
                        });
                    }).catch(function (err: Error) {
                        Log.error('DatasetController::process(..) - 3 ' + err.message + '');
                        return reject(err.message);
                    });
        }).catch(function (err: string) {
            Log.error('DatasetController::process(..) - 1 ' + err);
            return err;
        });
    }

    public addCourseSize(o: Object) {
        var dataList: Object[] = (<any>o)['result'];

        for (var i = 0; i < dataList.length; i++) {
            var d: any = dataList[i];
            d['Size'] = d['Pass'] + d['Fail'];
            if (d['Section'] == 'overall') {
                d['Year'] = 1900;
            }
        }
    }

    public processRoomsData(id: string, data: any, IDIsNew: number): Promise<number|string> {

        Log.trace('DatasetController::processRoomsData( ' + id + '... )');

        let that = this;

        var processedDataset: {[name: string]: Object|string} = {};
        var tempDataset: {[name: string]: string} = {};
        var allPromises: any = [];
        return new Promise(function (fulfill, reject) {
                let myZip = new JSZip();
                return myZip.loadAsync(data, {base64: true})
                    .then(function (zip: JSZip) {
                        Log.trace('DatasetController::process(..) - unzipped');

                        myZip.forEach(function (relativePath: string, file: JSZipObject) {
                            if (!file.dir) {
                                var splitPath = relativePath.split('/');
                                var fileName = splitPath[splitPath.length - 1];
                                if (fileName == 'index.htm') {
                                    fileName = 'index';
                                }
                                else if (fileName == '.DS_Store') {
                                    fileName = '';
                                }
                                else if (!(splitPath[0] == 'campus' && splitPath[1] == 'discover' && splitPath[2] == 'buildings-and-classrooms')) {
                                    Log.trace(relativePath);
                                    return reject('Dataset structure is invalid');
                                }

                                if (fileName != '') {                       // trying to deal with presence of .DS_Store
                                    var promise = file.async('string')
                                        .then(function success(content: string) {   // want index at beginning...?
                                            //var buildingData:RoomData[] = parseRooms(content);
                                            tempDataset[fileName.split('.')[0]] = content;
                                        }, function error(e: Error) {
                                            Log.error('process problem: ' + e.message);
                                            return reject(e.message);
                                        });
                                    allPromises.push(promise);
                                }
                            }

                        });
                        Promise.all(allPromises).then(function () {
                            if (Object.keys(tempDataset).length == 0) {
                                return reject('Zip contains no valid data');
                            }
                            else {
                                that.parseRoomsDataset(tempDataset).then(function (result: RoomData[]) {
                                    that.save(id, result);
                                    return fulfill(IDIsNew);
                                }).catch(function (err: Error) {
                                    Log.error('DatasetController::process(..) - 5 ' + err.message + '');
                                    return reject(err.message);
                                })
                            }
                        }).catch(function (err: Error) {
                            Log.error('DatasetController::process(..) - 4 ' + err.message + '');
                            return reject(err.message);
                        });
                    }).catch(function (err: Error) {
                        Log.error('DatasetController::process(..) - 3 ' + err.message + '');
                        return reject(err.message);
                    });

        }).catch(function (err: string) {
            Log.error('DatasetController::process(..) - 1 ' + err);
            return err;
        });
    }

    public parseRoomsDataset(tempDataset: {[name: string]: string}): Promise<RoomData[]> {
        let that = this;
        var buildingList: ASTNode[] = that.getBuildingListHTML(tempDataset);

        return new Promise(function (fulfill, reject) {
            that.getBuildingsData(buildingList, tempDataset).then(function (buildingData: BldgData[]) {
                var completeRooms: RoomData[] = that.createRooms(buildingData);
                fulfill(completeRooms);
            }).catch(function (err: any) {
                Log.trace('parseRoomsDataset ERROR: ' + err);
                reject('parseRoomsDataset ERROR: ' + err);
            });
        });
    }


    public createRooms(buildings: BldgData[]): RoomData[] {
        var finalData: RoomData[] = [];

        for (var i = 0; i < buildings.length; i++) {
            var building: BldgData = buildings[i];
            for (var j = 0; j < buildings[i].roomData.length; j++) {
                //var p = new Promise(function (fulfill, reject) {

                var data: ASTNode = building.roomData[j];
                var thisRoom: RoomData = {
                    fullname: building.fullName,
                    shortname: building.abbr,
                    number: ParserHelper.nodeAtPath(data, ['field-room-number', 'Room Details']).childNodes[0].value.toString().trim(),
                    name: building.abbr + '_' + ParserHelper.nodeAtPath(data, ['field-room-number', 'Room Details']).childNodes[0].value.trim(),
                    address: building.address,
                    seats: Number(ParserHelper.nodeAtPath(data, ['field-room-capacity']).childNodes[0].value.trim()),
                    type: ParserHelper.nodeAtPath(data, ['field-room-type']).childNodes[0].value.trim(),
                    furniture: ParserHelper.nodeAtPath(data, ['field-room-furniture']).childNodes[0].value.trim(),
                    href: ParserHelper.nodeAtPath(data, ['views-field-nothing', 'a']).attrs[0].value.trim(),
                    lat: building.lat,
                    lon: building.lon
                }

                finalData.push(thisRoom);
            }
        }
        return finalData;
    }


    public getBuildingListHTML(tempDataset: {[name: string]: string}): ASTNode[] {
        var indexHTML: string = tempDataset['index'];
        var parse5 = require('parse5');

        var node: ASTNode = parse5.parse(indexHTML);
        var table: ASTNode;

        var path: string[] = ['html',
            'body',
            'full-width-container',
            'main',
            'content',
            'section',
            'view-display-id-page container view-dom-id-',
            'view-content',
            'table',
            'tbody'];

        var toReturn = ParserHelper.nodeAtPath(node, path).childNodes;
        return ParserHelper.removeExcessElements(toReturn);
    }


    public getBuildingsData(buildingList: ASTNode[], tempDataset: {[name: string]: string}): Promise<BldgData[]> {
        return new Promise(function (outerfulfill, outerreject) {
                var buildingData: BldgData[] = [];
                var buildingPromises: any[] = [];
                var parse5 = require('parse5');

                for (var i = 0; i < buildingList.length; i++) {

                    var p = new Promise(function (fulfill, reject) {

                        var abbr: string = buildingList[i].childNodes[3].childNodes[0].value.trim();
                        var full: string = buildingList[i].childNodes[5].childNodes[1].childNodes[0].value.trim();
                        var addr: string = buildingList[i].childNodes[7].childNodes[0].value.trim();

                        var roomHTML: string = tempDataset[abbr];
                        if (roomHTML == null) {
                            fulfill();
                        }

                        var parse5 = require('parse5');
                        var node: ASTNode = parse5.parse(roomHTML);

                        var tableNode: ASTNode = ParserHelper.nodeAtPath(node, ['html',
                            'body',
                            'full-width-container',
                            'main',
                            'content',
                            'section',
                            'view view-buildings-and-classrooms view-id-buildings_and_classrooms view-display-id-page_1 container view-dom-id-',
                            'view-footer',
                            'view view-buildings-and-classrooms view-id-buildings_and_classrooms view-display-id-block_1 container view-dom-id-',
                            'view-content',
                            'table',
                            'tbody']);

                        if (tableNode == null) {        // case: no rooms in building
                            fulfill();
                        }

                        var roomNodes: ASTNode[] = ParserHelper.removeExcessElements(tableNode.childNodes);

                        var thisBuilding: BldgData = {
                            abbr: abbr,
                            fullName: full,
                            address: addr,
                            lat: null,
                            lon: null,
                            roomData: roomNodes
                        };

                        HTMLParser.getCoords(thisBuilding.address).then(function (result: {lat?: number, lon?: number, error?: string}) {
                            if ('lat' in result) {
                                thisBuilding.lat = result['lat'];
                                thisBuilding.lon = result['lon'];
                                buildingData.push(thisBuilding);
                                fulfill()
                            }
                            else {
                                Log.trace('getBuildingsData - could not get coordinates of ' + thisBuilding.address);
                                reject('getBuildingsData - could not get coordinates of ' + thisBuilding.address)
                            }
                        }).catch(function (err) {
                            Log.trace(err);
                            reject(err);
                        });
                    });

                    buildingPromises.push(p);
                }

                Promise.all(buildingPromises).then(function () {
                    outerfulfill(buildingData);
                }).catch(function (err) {
                    Log.trace('getBuildingsData - promises did not all fulfill');
                });
        });
    }


    // The contents of the file will depend on the id provided. e.g.,
    // some zips will contain .html files, some will contain .json files.
    // You can depend on 'id' to differentiate how the zip should be handled,
    // although you should still be tolerant to errors.

    /**
     * Writes the processed dataset to disk as 'id.json'. The function should overwrite
     * any existing dataset with the same name.
     *
     * @param id
     * @param processedDataset
     */
    private save(id: string, processedDataset: any) {
        try {
            this.datasets[id] = processedDataset;

            var fs = require('fs');
            var dataPath = __dirname.split('/src')[0] + '/data/';       // will this work across systems?
            Log.trace(dataPath);
            fs.writeFile(dataPath + id + '.json', JSON.stringify(processedDataset), function (err: string) {
                if (err) {
                    Log.trace("DatasetController::save - ERROR: " + err);
                }
                else {
                    Log.trace("Information was saved\n");
                }
            });
        }
        catch (err) {
            Log.trace('DataSetController::save error - ' + err.message);
        }
    }
}
