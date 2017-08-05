/**
 * Created by Kirsten on 2016-11-23.
 */


/* courseObject {
 dept: string
 id: string
 size: number
 sections: number
 blocks: number[],
 rooms: string[]         // room names (i.e. WOOD_1)
 }
 */

var noRooms = [];

// rooms[index] is possible rooms for courses[index]
// blocks[roomName] are the available timeslots for roomName

function createSchedule(depts, ids, buildings, dist, target) {
    console.log('start createSchedule');

    var changingCoursesList;
    var finalFilteredBuildings;

    return getCourses(depts, ids)
        .then(function (coursedata) {
            return createCourseObjects(coursedata)
        })
        .then(function (courses) {
            changingCoursesList = courses;
            return getBuildingsWithinDistance(dist, target, buildings);
        })
        .then(function (filteredBuildings) {
            finalFilteredBuildings = filteredBuildings;
            return createRoomsLists(changingCoursesList, finalFilteredBuildings);
        })
        .then(function (filteredRooms) {
            var blocks = initializeBlocks(finalFilteredBuildings, filteredRooms[filteredRooms.length - 1]);
            var finalCourses = solveSchedule(changingCoursesList, filteredRooms, blocks);

            localStorage.setItem('scheduleResults', JSON.stringify(finalCourses));
            localStorage.setItem('noRooms', JSON.stringify(noRooms));
            window.open('scheduleResults.html');
        })
        .catch(function (e) {
            console.log(e);
        });
}


function getCourses(depts, ids) {

    return new Promise(function (fulfill, reject) {
        var courses = {};

        var query = '{"GET": ["courses_dept", "courses_id", "courseSize"],';
        query += getWhere(depts, ids);
        query += '"GROUP": ["courses_dept", "courses_id"], "APPLY": [{"courseSize": {"MAX": "courses_size"}}], "ORDER": {"dir": "DOWN", "keys": ["courseSize"]}, "AS": "TABLE"}';

        try {
            $.ajax("/query", {
                type: "POST",
                data: query,
                contentType: "application/json",
                dataType: "json",
                success: function (data) {
                    if (data["render"] === "TABLE") {
                        courses = data["result"];
                        fulfill(courses);

                    }
                },
            }).fail(function (e) {
                console.log('problem: ' + JSON.stringify(e));
                reject(e);
            });
        } catch (err) {
            console.log("Query Error", err);
            reject(err);
        }
    });
}


function solveSchedule(courses, rooms, blocks) {
    //console.log('starting solveSchedule');

    var numComplete = 0;
    var violations = 0;
    var total = 0;

    for (var c = 0; c < courses.length; c++) {
        total += courses[c]['sections'];
    }

    // termination condition
    if (numComplete + violations == total) {
        return courses;
    }

    for (var course = 0; course < courses.length; course++) {
        var currCourse = courses[course];
        var successes = scheduleCourse(currCourse, course, rooms, blocks);
        numComplete += successes;
        if (successes < currCourse['sections']) {
            violations += currCourse['sections'] - successes;
        }

        //console.log('this course: ' + JSON.stringify(currCourse));
    }
    console.log(numComplete + ' successful; ' + violations + ' violations');
    localStorage.setItem('successes', numComplete);
    localStorage.setItem('violations', violations);
    return courses;
}

function scheduleCourse(course, courseIndex, rooms, blocks) {          // returns int - # of sec successfully scheduled
    var possibleRooms = rooms[courseIndex];
    var roomsToRemove = [];
    var successes = 0;
    var s = 0;
    outerloop:
        while (s < course['sections']) {
            for (var r = 0; r < possibleRooms.length; r++) {
                var room = possibleRooms[r];
                for (var b = 0; b < blocks[room].length; b++) {
                    var block = blocks[room][b];
                    if (course['blocks'].indexOf(block) == -1) {
                        course['blocks'].push(block);
                        course['rooms'].push(room);

                        if (blocks[room].length == 1) {             // if no more blocks are left for this room
                            roomsToRemove.push(r);
                        }
                        removeBlock(b, room, blocks);     // remove block from room that has just been used
                        s++;
                        successes++;
                        continue outerloop;
                    }
                }
            }
            s++;
        }
    // remove any newly-unavailable rooms
    if (roomsToRemove.length > 0) {
        removeRoomsFromDomain(roomsToRemove, courseIndex, rooms);
    }
    return successes;
}

function removeRoomsFromDomain(indicesOfRoomsToPrune, courseIndex, rooms) {
    for (var i = 0; i < indicesOfRoomsToPrune.length; i++) {
        console.log('removing room ' + rooms[courseIndex][indicesOfRoomsToPrune[i]]);
        rooms[courseIndex].splice(indicesOfRoomsToPrune[i], 1);

    }
}

function removeBlock(blockIndex, roomName, blocks) {
    //console.log('removing block ' + blocks[roomName][blockIndex]);
    blocks[roomName].splice(blockIndex, 1);

}


function initializeBlocks(buildings, largestRoomSet) {
    var blocks = {};

    for (var i = 0; i < largestRoomSet.length; i++) {
        blocks[largestRoomSet[i]] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    }
    return blocks;
}


function createRoomsLists(courseList, buildings) {

    //console.log('starting createRoomsList');

    var query1;
    var query2;
    var query3 = '';

    if (!buildings || buildings.length < 1) {
        query1 = '{"GET": ["rooms_name", "rooms_seats"], "WHERE": {"GT": {"rooms_seats": '; // add buildings OR
        query2 = '}}, "ORDER": "rooms_seats", "AS": "TABLE"}';
    }
    else {
        query1 = '{"GET": ["rooms_name", "rooms_seats"], "WHERE": {"AND": [{"GT": {"rooms_seats": '; // add buildings OR
        query2 = '}}, {"OR": [';

        for (var b = 0; b < buildings.length - 1; b++) {
            query2 += '{"IS": {"rooms_shortname": "' + buildings[b] + '"}}, '
        }
        query2 += '{"IS": {"rooms_shortname": "' + buildings[b] + '"}}';

        query3 = ']}]}, "ORDER": "rooms_seats", "AS": "TABLE"}';
    }

    return new Promise(function (fulfill, reject) {
        var roompromises = [];
        var roomSets = [];

        // get possible rooms for each section

        for (var s = 0; s < courseList.length; s++) {
            var currCourse = courseList[s];

            var query = query1 + (Number(courseList[s]['size']) - 1).toString() + query2 + query3;
            console.log(query);

            var p = new Promise(function (roomFulfill, roomReject) {
                (function (s, dept, id) {
                    try {
                        $.ajax("/query", {
                            type: "POST",
                            data: query,
                            contentType: "application/json",
                            dataType: "json",
                            success: function (data) {
                                if (data["render"] === "TABLE") {
                                    var roomList = [];
                                    //console.log(JSON.stringify(data));
                                    for (var r = 0; r < data['result'].length; r++) {
                                        roomList.push(data['result'][r]["rooms_name"]);
                                    }

                                    if (roomList.length < 1) {
                                        noRooms.push(dept + id);
                                    }

                                    roomSets[s] = roomList;
                                    roomFulfill();
                                }
                            },
                        }).fail(function (e) {
                            console.log('problem: ' + JSON.stringify(e));
                            roomReject(e);
                        });
                    } catch (err) {
                        console.log("Query Error", err);
                        roomReject(err);
                    }
                }(s, currCourse['dept'], currCourse['id']));
            });

            roompromises.push(p);

        }

        Promise.all(roompromises).then(function () {
            fulfill(roomSets);
        });
    });

}


function createCourseObjects(sections) {

    //console.log('createCourseObjects sections: ' + JSON.stringify(sections));

    return new Promise(function (fulfill, reject) {

        var results = [];
        var coursepromises = [];

        for (var s = 0; s < sections.length; s++) {

            var query = '{"GET": ["courses_dept", "courses_id", "sectionCount"], "WHERE": {"AND": [{"IS": {"courses_dept": "' + sections[s]['courses_dept'] + '"}}, {"IS": {"courses_id": "' + sections[s]['courses_id'] + '"}}, {"EQ": {"courses_year": 2014}}]}, "GROUP": ["courses_dept", "courses_id"], "APPLY": [{"sectionCount": {"COUNT": "courses_uuid"}}], "AS": "TABLE"}';

            var p = new Promise(function (fulfillCourse, rejectCourse) {
                (function (s) {
                    try {
                        $.ajax("/query", {
                            type: "POST",
                            data: query,
                            contentType: "application/json",
                            dataType: "json",
                            success: function (data) {
                                if (data["render"] === "TABLE") {
                                    if (data["result"].length > 0) {
                                        var thisCourse = data["result"][0];

                                        var courseObject = {
                                            dept: thisCourse['courses_dept'],
                                            id: thisCourse['courses_id'],
                                            size: Number(sections[s]['courseSize']),
                                            sections: Math.ceil(Number(thisCourse['sectionCount'] / 3)),     // check rounds up to nearest int
                                            blocks: [],
                                            rooms: []
                                        };
                                        //console.log('pushing course object ' + JSON.stringify(courseObject));
                                        results.push(courseObject);
                                    }
                                    fulfillCourse();
                                }
                            }
                        }).fail(function (e) {
                            console.log(JSON.stringify(e));
                            rejectCourse(e);
                        });
                    } catch (err) {
                        console.log("Query Error", err);
                        rejectCourse(e);
                    }
                }(s));
            });

            coursepromises.push(p);
        }

        Promise.all(coursepromises).then(function () {
            fulfill(results.sort(function (a, b) {
                return b['size'] - a['size'];
            }));
        });
    });
}


function getWhere(depts, ids) {
    //console.log('start getWhere');
    //console.log('depts: ' + JSON.stringify(depts) + '; ids: ' + JSON.stringify(ids));
    var where;
    if ((depts.length < 1 || !depts) && (ids.length < 1 || !ids)) {
        where = '"WHERE": {"NOT": {"IS": {"courses_section": "overall"}}}, ';
    }
    else if (depts.length < 1 || !depts) {
        where = '"WHERE": {"AND": [{"NOT": {"IS": {"courses_section": "overall"}}}, {"OR": [';
        for (var i = 0; i < ids.length - 1; i++) {
            where += '{"IS": {"courses_id": "' + ids[i] + '"}}, ';
        }
        where += '{"IS": {"courses_id": "' + ids[i] + '"}}]}]}, ';
    }
    else if (ids.length < 1 || !ids) {
        where = '"WHERE": {"AND": [{"NOT": {"IS": {"courses_section": "overall"}}}, {"OR": [';
        for (var i = 0; i < depts.length - 1; i++) {
            where += '{"IS": {"courses_dept": "' + depts[i] + '"}}, ';
        }
        where += '{"IS": {"courses_dept": "' + depts[i] + '"}}]}]}, ';
    }
    else {
        where = '"WHERE": {"AND": [{"NOT": {"IS": {"courses_section": "overall"}}}, {"OR": [';
        for (var i = 0; i < ids.length - 1; i++) {
            where += '{"IS": {"courses_id": "' + ids[i] + '"}}, ';
        }
        where += '{"IS": {"courses_id": "' + ids[i] + '"}}]}, {"OR": [';

        for (var i = 0; i < depts.length - 1; i++) {
            where += '{"IS": {"courses_dept": "' + depts[i] + '"}}, ';
        }
        where += '{"IS": {"courses_dept": "' + depts[i] + '"}}]}]}, ';
    }
    // console.log(where);
    return where;

}


function getBuildingsWithinDistance(dist, targetBuilding, buildings) {

    return new Promise(function (buildingsfulfill, buildingsreject) {
        if (!dist || !targetBuilding) {
            buildingsfulfill(buildings);
        }
        else {
            if (!buildings || buildings.length < 1) {

                return getTargetCoords(targetBuilding)
                    .then(function (target) {
                        return allBuildingInfo(target, dist)
                    })
                    .then(function (filteredBuildings) {
                        return buildingsfulfill(filteredBuildings)
                    })
                    .catch(function (e) {
                        buildingsreject(e);
                    });
            }
            else {

                return getTargetCoords(targetBuilding)
                    .then(function (target) {
                        return selectBuildingInfo(target, buildings, dist)
                    })
                    .then(function (filteredBuildings) {
                        return buildingsfulfill(filteredBuildings)
                    })
                    .catch(function (e) {
                        buildingsreject(e);
                    });
            }
        }
    });
}

// source: https://gist.github.com/moshmage/2ae02baa14d10bd6092424dcef5a1186
function withinRadius(point, interest, ms) {
    'use strict';
    var givenDist = ms / 1000;      // in metres; convert to km
    var R = 6371;                   // this is km
    var deg2rad = function (n) {
        return Math.tan(n * (Math.PI / 180))
    };
    var dLat = deg2rad(interest.latitude - point.latitude);  // get the difference
    var dLon = deg2rad(interest.longitude - point.longitude);

    var i = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(point.latitude)) * Math.cos(deg2rad(interest.latitude)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var j = 2 * Math.asin(Math.sqrt(i));
    var k = R * j;

    var statement = (k <= givenDist);
    console.log('k: ' + k + '; givenDist: ' + givenDist + '; returning ' + statement);
    return statement;
}

function getTargetCoords(targetBuilding) {
    var targetquery = '{"GET": ["rooms_lat", "rooms_lon"], "WHERE": {"IS": {"rooms_shortname": "' + targetBuilding + '"}}, "AS": "TABLE"}';

    //var query = JSON.parse(targetquery);

    return new Promise(function (fulfill, reject) {
        try {
            $.ajax("/query", {
                type: "POST",
                data: targetquery,
                contentType: "application/json",
                dataType: "json",
                success: function (data) {
                    if (data["render"] === "TABLE") {
                        fulfill(data['result'][0]);
                    }
                },
            }).fail(function (e) {
                console.log('problem: ' + JSON.stringify(e));
                reject(e);
            });
        } catch (err) {
            console.log("Query Error", err);
            reject(err);
        }
    });
}


function allBuildingInfo(target, dist) {

    return new Promise(function (fulfill, reject) {
        var filteredBuildings = [];

        var allbuildingquery = '{"GET": ["rooms_shortname", "rooms_lat", "rooms_lon"], "WHERE": {}, "GROUP": ["rooms_shortname", "rooms_lat", "rooms_lon"], "APPLY": [], "AS": "TABLE"}';

        try {
            $.ajax("/query", {
                type: "POST",
                data: allbuildingquery,
                contentType: "application/json",
                dataType: "json",
                success: function (data) {
                    if (data["render"] === "TABLE") {
                        var res = data['result'];
                        for (var i = 0; i < res.length; i++) {
                            if (withinRadius({
                                    latitude: target['rooms_lat'],
                                    longitude: target['rooms_lon']
                                }, {latitude: res[i]['rooms_lat'], longitude: res[i]['rooms_lon']}, dist)) {
                                filteredBuildings.push(res[i]['rooms_shortname']);
                            }
                        }
                        fulfill(filteredBuildings);
                    }
                },
            }).fail(function (e) {
                console.log('problem: ' + JSON.stringify(e));
                reject(e);
            });
        } catch (err) {
            console.log("Query Error", err);
            reject(err);
        }
    });
}

function selectBuildingInfo(target, buildings, dist) {

    return new Promise(function (buildingsfulfill, buildingsreject) {

        var filteredBuildings = [];
        var promises = [];

        for (var b = 0; b < buildings.length; b++) {
            var selectbuildingsquery = '{"GET": ["rooms_shortname", "rooms_lat", "rooms_lon"], "WHERE": {"IS": {"rooms_shortname": "' + buildings[b] + '"}}, "AS": "TABLE"}';

            var p = new Promise(function (fulfill, reject) {
                (function (b) {
                    try {
                        $.ajax("/query", {
                            type: "POST",
                            data: selectbuildingsquery,
                            contentType: "application/json",
                            dataType: "json",
                            success: function (data) {
                                if (data["render"] === "TABLE") {
                                    var res = data['result'];

                                    if (withinRadius({
                                            latitude: target['rooms_lat'],
                                            longitude: target['rooms_lon']
                                        }, {
                                            latitude: res[0]['rooms_lat'],
                                            longitude: res[0]['rooms_lon']
                                        }, dist)) {
                                        filteredBuildings.push(res[0]['rooms_shortname']);
                                    }
                                    fulfill();
                                }
                            },
                        }).fail(function (e) {
                            console.log('problem: ' + JSON.stringify(e));
                            reject(e);
                        });
                    } catch (err) {
                        console.log("Query Error", err);
                        reject(err);
                    }
                }(b));
            });
            promises.push(p);
        }
        Promise.all(promises).then(function () {
            buildingsfulfill(filteredBuildings);
        }).catch(function (e) {
            buildingsreject(e);
        });
    });
}






