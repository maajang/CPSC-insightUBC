/**
 * Created by ajangbul on 2016-11-23.
 */

/**
 * Created by ajangbul on 2016-11-23.
 */

$(function () {

    $("#roomSearchForm").submit(function (e) {
        e.preventDefault();
        if (!validateFields()) {
            return false;
        }
        var query = constructRoomQuery();
        try {
            $.ajax("/query", {
                type: "POST", data: query, contentType: "application/json", dataType: "json", success: function (data) {
                    if (data["render"] === "TABLE") {
                        filterbyDistance(data["result"]).then(function (filteredResults) {
                            document.getElementById('roomResults').innerHTML = makeRoomTable(filteredResults);
                            $("#roomResults").DataTable({
                                "destroy": true,
                                "paging": false,
                                "searching": false
                            });
                        })
                    }
                }
            }).fail(function (e) {
                console.log(e)
            });
        } catch (err) {
            console.log("Query Error", err);
        }
    });
    function validateFields() {
        var rName = $('#R_buildingNameField').val();
        var rNumber = $('#R_roomNumberField').val();
        var rType = $('#R_roomTypeField').val();
        var rSeats = $('#R_roomSizeField').val();
        var rFurniture = $('#R_roomFurnitureField').val();

        var dist = ($('#R_roomLocationField')).val();

        if (dist) {
            if (dist.length > 0) {
                if (isNaN(Number(dist)) || Number(dist) <= 0) {
                    window.alert('Please input a valid distance.');
                    return false;
                }
            }
        }

        comp = $('#R_comparator').val();
        if (comp) {
            if (rSeats.length > 0) {
                if (isNaN(Number(rSeats))) {
                    window.alert('Section size must be a number.');
                    return false;
                }
                if (Number(rSeats) <= 0) {
                    window.alert('Section size must be greater than zero.');
                    return false;
                }
            }
            else {
                window.alert('Please specify a size number.');
                return false;
            }
        }

        // if (!(rName || rNumber || rType || rSeats || rFurniture)) {
        //     window.alert('Please enter something into one of the search fields');
        //     return false;
        // }
        return true;
    }

    function constructRoomQuery() {
        var buildingName = $('#R_buildingNameField').val();
        var rNumber = $('#R_roomNumberField').val();
        var rSeats = $('#R_roomSizeField').val();
        var rComp = $('#R_comparator').val();
        var rType = $('#R_roomTypeField').val();
        var rFurniture = $('#R_roomFurnitureField').val();


        // contruct a simple query

        var query = '{"GET": ["rooms_fullname", "rooms_shortname", "rooms_number", "rooms_seats", "rooms_type", "rooms_furniture", "rooms_lat", "rooms_lon"], ';
        query += getWhere(buildingName, rNumber, rSeats, rComp, rType, rFurniture);
        query += '"ORDER": {"dir": "UP", "keys": ["rooms_shortname", "rooms_number"]}, "AS": "TABLE"}';

        return query;

    }

    // source: https://gist.github.com/moshmage/2ae02baa14d10bd6092424dcef5a1186
    function withinRadius(point, interest, ms) {
        'use strict';
        var givenDist = ms / 1000;      // convert to km
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
        return statement;
    }

    function getWhere(buildingName, rNumber, rSeats, rComp, rType, rFurniture) {       // add section size functionality
        var components = [];
        var where = '"WHERE": ';
        if (buildingName) {
            var a = '{"IS": {"rooms_shortname": "' + buildingName + '"}}';
            components.push(a);
        }
        if (rNumber) {
            var b = '{"IS": {"rooms_number": "' + rNumber + '"}}';
            components.push(b);
        }
        if (rSeats && rComp) {
            var c = '{"' + rComp + '": {"rooms_seats": "' + rSeats + '"}}';
            components.push(c);
        }
        if (rType) {
            var d = '{"IS": {"rooms_type": "' + rType + '"}}';
            components.push(d);
        }
        if (rFurniture) {
            var e = '{"IS": {"rooms_furniture": "' + rFurniture + '"}}';
            components.push(e);
        }

        if (components.length == 0) {
            where += '{},';
        }
        else if (components.length == 1) {
            where += components[0] + ',';
        }
        else {
            where += '{"AND": [';
            for (var z = 0; z < components.length - 1; z++) {
                where += components[z] + ','
            }
            where += components[components.length - 1];
            where += ']}, '
        }
        return where;
    }

    // check if the results we've got are within a given distance of building X
    function filterbyDistance(data1) {

        return new Promise(function (fulfill, reject) {

            var dist = $('#R_roomLocationField').val();
            var buildingX = $('#R_roomLocationField1').val();

            if (!dist || !buildingX) {
                fulfill(data1);
            }

            else {
                var query = '{"GET": [ "rooms_lat", "rooms_lon"], "WHERE": {"IS": {"rooms_shortname": "' + buildingX + '"}}, "AS": "TABLE"}';
                try {
                    $.ajax("/query", {
                        type: "POST",
                        data: query,
                        contentType: "application/json",
                        dataType: "json",
                        success: function (data) {
                            if (data["render"] === "TABLE") {
                                var lat = data['result'][0]['rooms_lat'];
                                var lon = data['result'][0]['rooms_lon'];

                                var results = [];
                                for (var d = 0; d < data1.length; d++) {
                                    if (withinRadius({latitude: lat, longitude: lon}, {latitude: data1[d]['rooms_lat'], longitude: data1[d]['rooms_lon']
                                        }, dist)) {
                                        results.push(data1[d]);
                                    }

                                }
                                fulfill(results);
                            }
                        }
                    }).fail(function (e) {
                        console.log(e);
                        reject(e);
                    });
                } catch (err) {
                    console.log("Query Error", err);
                    reject(err);
                }

            }
        });
    }


    function makeRoomTable(data) {
        if (Object.keys(data).length == 0) {
            return 'No results were found for the search criteria you entered.'
        }
        // set headings
        var tableContents = '<table id="resultsTable">' +
            '<thead>' +
            '<tr>' +
            '<th>Building</th>' +
            '<th>Room Number</th>' +
            '<th>Room Capacity</th>' +
            '<th>Room Type</th>' +
            '<th>Room Furniture</th>' +
            '</tr></thead><tbody>';

        var comp = $('#R_comparator').val();
        var rSeats = $('#R_roomSizeField').val();


        // set table data
        data.forEach(function (row) {
/*            var keys = Object.keys(row);
            var statement = true;
            if (comp) {
                switch (comp) {
                    case 'GT':
                        statement = row[keys[3]] > rSeats;
                        break;
                    case 'EQ':
                        statement = row[keys[3]] == rSeats;
                        break;
                    case 'LT':
                        statement = row[keys[3]] < rSeats;
                        break;
                }
            }*/
            //if (statement) {
                tableContents += '<tr>' +
                    '<td><a href="javascript:void(0)" onclick="initDialog(\'' + row['rooms_shortname'] + '\'); return false;" class="buildingNameLink">' + row['rooms_fullname'] + ' - ' + row['rooms_shortname'] + '</a></td>' +
                    '<td>' + row['rooms_number'] + '</td>' +
                    '<td>' + row['rooms_seats'] + '</td>' +
                    '<td>' + row['rooms_type'] + '</td>' +
                    '<td>' + row['rooms_furniture'] + '</td>';
            //}
        });
        tableContents += '</tbody></table>';
        return tableContents;
    }

});

function setSelectMenus() {
    return getFurnitureAndType().then(function () {
        initializeFurnitureAndTypeOptions();

        $('#R_roomFurnitureField').selectmenu();
        //$("#rating").val("");
        //$('#rating').selectmenu("refresh");

        $('#R_roomTypeField').selectmenu();
        //$("#genre").val("");
        //$('#genre').selectmenu("refresh");
    })
}

function getFurnitureAndType() {

    return new Promise(function (fulfill, reject) {

        if (localStorage.getItem('furniture') != null) {
            fulfill();
        }
        else {
            var query = '{"GET": ["rooms_furniture", "rooms_type"], "WHERE": {}, "AS": "TABLE"}';
            try {
                $.ajax("/query", {
                    type: "POST",
                    data: query,
                    contentType: "application/json",
                    dataType: "json",
                    success: function (data) {
                        if (data["render"] === "TABLE") {

                            var furnitures = [];
                            var types = [];
                            var res = data['result'];
                            for (var d = 0; d < res.length; d++) {
                                if (furnitures.indexOf(res[d]['rooms_furniture']) == -1) {
                                    furnitures.push(res[d]['rooms_furniture']);
                                }
                                if (types.indexOf(res[d]['rooms_type']) == -1) {
                                    types.push(res[d]['rooms_type']);
                                }

                            }
                            localStorage.setItem('furniture', JSON.stringify(furnitures));
                            localStorage.setItem('type', JSON.stringify(types));
                            fulfill();
                        }
                    }
                }).fail(function (e) {
                    console.log(e);
                    reject(e);
                });
            } catch (err) {
                console.log("Query Error", err);
                reject(err);
            }
        }
    });
}

function initializeFurnitureAndTypeOptions() {
    var furniture = JSON.parse(localStorage.getItem('furniture'));
    var types = JSON.parse(localStorage.getItem('type'));

    for (var f = 0; f < furniture.length; f++) {
        document.getElementById('R_roomFurnitureField').innerHTML += '<option value="' + furniture[f] + '">' + furniture[f] + '</option>';
    }

    for (var t = 0; t < types.length; t++) {
        if (types[t] != '') {
            document.getElementById('R_roomTypeField').innerHTML += '<option value="' + types[t] + '">' + types[t] + '</option>';
        }
    }
}


function generateBuildingRadioButtons() {
    if (!localStorage.getItem('buildings')) {
        var query = '{"GET": ["rooms_shortname", "rooms_fullname"], "WHERE": {}, "ORDER": "rooms_shortname", "AS": "TABLE"}';

        try {
            $.ajax("/query", {
                type: "POST",
                data: query,
                contentType: "application/json",
                dataType: "json",
                success: function (data) {
                    if (data["render"] === "TABLE") {
                        setLocalStorageRooms(data["result"]);
                    }
                }
            }).fail(function (e) {
                window.alert(e);
            });
        } catch (err) {
            window.alert("Query Error", err);
        }
    }

    document.getElementById('buildingOptions').innerHTML = makeRadioOptions();
}

function makeRadioOptions() {
        var data = JSON.parse(localStorage.getItem('buildings'));

        var toAdd = '<fieldset id="buildingRadios"><legend>Select a building:</legend>';
        for (var d = 0; d < data.length; d++) {
                toAdd += ' <input type="radio" name="bldgOpt" value="' + data[d].split(' - ')[data[d].split.length - 1] + '"><label for="checkbox-' + d + '">' + data[d] + '</label><br>';
        }
        toAdd += '</fieldset>';

        return toAdd;
}