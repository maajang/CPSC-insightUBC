/**
 * Created by Kirsten on 2016-11-23.
 */


function getCheckedValues(type) {
    var result = [];
    if (document.getElementById('selectAll' + type).checked) {
        //return JSON.parse(localStorage.getItem(type));
        return null;
    }
    else {
        var boxes = document.getElementsByName(type);
        for (var b = 0; b < boxes.length; b++) {
            if (boxes[b].checked) {
                result.push(boxes[b].value);
            }
        }

    }
    return result;
}

function setDepartmentsAndCourses() {

    if (!localStorage.getItem('departments')) {
        var query = '{"GET": ["courses_dept", "courses_id"], "WHERE": {}, "AS": "TABLE"}';

        try {
            $.ajax("/query", {
                type: "POST",
                data: query,
                contentType: "application/json",
                dataType: "json",
                success: function (data) {
                    if (data["render"] === "TABLE") {
                        setLocalStorageCourses(data["result"]);
                    }
                }
            }).fail(function (e) {
                window.alert(e);
            });
        } catch (err) {
            window.alert("Query Error", err);
        }
    }

    document.getElementById('deptInput').innerHTML = makeCheckBoxes('departments', 'Departments');
    document.getElementById('courseIDInput').innerHTML = makeCheckBoxes('ids', 'Course IDs');
}

function setBuildings() {
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

    document.getElementById('roomsInput').innerHTML = makeCheckBoxes('buildings', 'Buildings');

}

function setLocalStorageRooms(data) {
    var buildings = [];

    for (var b in data) {
        var a = data[b]['rooms_fullname'] + ' - ' + data[b]['rooms_shortname'] + '';
        if (buildings.indexOf(a) == -1) {
            buildings.push(a);
        }
    }
    localStorage.setItem('buildings', JSON.stringify(buildings));
}

function setLocalStorageCourses(data) {

    var depts = [];
    var ids = [];
    for (var d in data) {
        if (depts.indexOf(data[d]["courses_dept"]) == -1) {
            depts.push(data[d]["courses_dept"]);
        }
        if (ids.indexOf(data[d]["courses_id"]) == -1) {
            ids.push(data[d]["courses_id"]);
        }
    }
    var idsSorted = ids.sort(function (a, b) {
        return a - b
    });
    localStorage.setItem('departments', JSON.stringify(depts));
    localStorage.setItem('ids', JSON.stringify(idsSorted));
}


function makeCheckBoxes(storageID, title) {
    var data = JSON.parse(localStorage.getItem(storageID));

    var toAdd = '<fieldset id="deptOptions"><legend>' + title + ':</legend><input type="checkbox" id="selectAll' + storageID + '">Select All<br/>';
    for (var d = 0; d < data.length; d++) {
        if (storageID == 'buildings') {
            toAdd += ' <input type="checkbox" name="' + storageID + '" value="' + data[d].split('- ')[1] + '"><label for="checkbox-' + d + '">' + data[d] + '</label><br>';
        }
        else {
            toAdd += ' <input type="checkbox" name="' + storageID + '" value="' + data[d] + '"><label for="checkbox-' + d + '">' + data[d] + '</label><br>';
        }
    }
    toAdd += '</fieldset>';

    return toAdd;
}


// SELECT ALL BOXES

$(document).on("change", "input[id='selectAlldepartments']", function () {
    var boxes = document.getElementsByName('departments');
    if (this.checked) {
        for (var i = 0; i < boxes.length; i++) {
            boxes[i].checked = true;
        }
    }
    else {
        for (var i = 0; i < boxes.length; i++) {
            boxes[i].checked = false;
        }
    }
});

$(document).on("change", "input[id='selectAllids']", function () {
    var boxes = document.getElementsByName('ids');
    if (this.checked) {
        for (var j = 0; j < boxes.length; j++) {
            boxes[j].checked = true;
        }
    }
    else {
        for (var j = 0; j < boxes.length; j++) {
            boxes[j].checked = false;
        }
    }
});

$(document).on("change", "input[id='selectAllbuildings']", function () {
    var boxes = document.getElementsByName('buildings');
    if (this.checked) {
        for (var k = 0; k < boxes.length; k++) {
            boxes[k].checked = true;
        }
    }
    else {
        for (var k = 0; k < boxes.length; k++) {
            boxes[k].checked = false;
        }
    }
});





