/**
 * Created by Kirsten on 2016-11-28.
 */



function generateScheduleConflicts(thisCourse, errorsShown, difference) {

    var noRooms = JSON.parse(localStorage.getItem('noRooms'));

    if (!errorsShown) {
        document.getElementById('ErrorsTab').style.visibility = 'visible';
        document.getElementById('errorTabElement').style.visibility = 'visible';
    }

    var courseName = thisCourse['dept'] + thisCourse['id'];
    if (noRooms.indexOf(courseName) != -1) {
        if (difference == 1) {
            document.getElementById('noSpaceList').innerHTML += '<br><b>1</b> section of <b>' + thisCourse['dept'] + ' ' + thisCourse['id'] + '</b> - requires a room with capacity of at least <b>' + thisCourse['size'] + '</b><br>';
        }
        else {
            document.getElementById('noSpaceList').innerHTML += '<br><b>' + difference + '</b> sections of <b>' + thisCourse['dept'] + ' ' + thisCourse['id'] + '</b> - each require rooms with a capacity of at least <b>' + thisCourse['size'] + '</b><br>';
        }
        return 0;

    }
    else {
        if (difference == 1) {
            document.getElementById('noTimeList').innerHTML += '<br><b>1</b> section of <b>' + thisCourse['dept'] + ' ' + thisCourse['id'] + '</b> - requires a room with capacity of at least <b>' + thisCourse['size'] + '</b><br>';
        }
        else {
            document.getElementById('noTimeList').innerHTML += '<br><b>' + difference + '</b> sections of <b>' + thisCourse['dept'] + ' ' + thisCourse['id'] + '</b> - each require rooms with a capacity of at least <b>' + thisCourse['size'] + '</b><br>';
        }
        return difference;
    }
}


function renderSchedule() {

    resetSchedule();

    var totalFailures = 0;
    var noRooms = 0;
    var errorsShown = false;
    var res = JSON.parse(localStorage.getItem('scheduleResults'));

    for (var c = 0; c < res.length; c++) {
        var thisCourse = res[c];
        var numBlocks = thisCourse['blocks'].length;

        if (numBlocks < thisCourse['sections']) {
            var difference = thisCourse['sections'] - numBlocks;
            totalFailures += difference;
            noRooms += generateScheduleConflicts(thisCourse, errorsShown, difference);
            errorsShown = true;
            continue;
        }

        for (var b = 0; b < numBlocks; b++) {
            var blockID = 'b' + thisCourse['blocks'][b];
            document.getElementById(blockID).innerHTML += '<br>' + thisCourse['dept'] + ' ' + thisCourse['id'] + '<br>' + thisCourse['rooms'][b] + '<br>';
        }
    }
    showQuality(noRooms);
}

function showQuality(noSpace) {

    var noTime = Number(localStorage.getItem('violations')) - noSpace;
    var successes = Number(localStorage.getItem('successes'));
    var total = noSpace + noTime + successes;

    console.log('noTime: ' + noTime);
    console.log('noSpace: ' + noSpace);
    console.log('successes: ' + successes);
    console.log('total: ' + total);

    document.getElementById('successesResult').innerHTML = '<b>' + successes + '</b> out of <b>' + total + '</b> sections';
    document.getElementById('noTimeResult').innerHTML = '<b>' + noSpace + '</b> out of <b>' + total + '</b> sections';
    document.getElementById('noSpaceResult').innerHTML = '<b>' + noTime + '</b> out of <b>' + total + '</b> sections';
}

function resetSchedule() {
    console.log('starting resetSchedule');
    for (var i = 1; i < 16; i++) {
        $('#b' + i).html("");
    }
    $('#errorBody').html("<br>");
}
