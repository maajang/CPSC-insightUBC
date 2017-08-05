/**
 * Created by Kirsten on 2016-11-18.
 */

$(function () {

    $("#sectionSearchForm").submit(function (e) {
        e.preventDefault();
        if (!validateFields('S_')) {
            return false;
        }
        var query = constructSectionQuery();
        try {
            $.ajax("/query", {
                type: "POST", data: query, contentType: "application/json", dataType: "json", success: function (data) {
                    if (data["render"] === "TABLE") {

                        document.getElementById('sectionResults').innerHTML = makeSectionTable(data["result"]);
                        $("#sectionResults").DataTable({
                            "destroy": true,
                            "paging": false,
                            "searching": false
                        });
                    }
                }
            }).fail(function (e) {
                console.log(e)
            });
        } catch (err) {
            console.log("Query Error", err);
        }
    });

    $("#courseSearchForm").submit(function (e) {
        e.preventDefault();
        if (!validateFields('C_')) {
            return false;
        }
        var query = constructCourseQuery();
        console.log(query);
        try {
            $.ajax("/query", {
                type: "POST", data: query, contentType: "application/json", dataType: "json", success: function (data) {
                    if (data["render"] === "TABLE") {
                        document.getElementById('courseResults').innerHTML = makeCourseTable(data["result"]);
                        $("#courseResults").DataTable({
                            "destroy": true,
                            "paging": false,
                            "searching": false
                        });                    }
                }
            }).fail(function (e) {
                console.log(e)
            });
        } catch (err) {
            console.log("Query Error", err);
        }
    });


    function validateFields(type) {
        var dept = $('#' + type + 'departmentField').val();
        var cNo = $('#' + type + 'courseNumberField').val();
        var cTitle = $('#' + type + 'courseTitleField').val();
        var instr = $('#' + type + 'instructorField').val();
        var comp = '';
        var secSize = '';


        comp = $('#' + type + 'comparator').val();
        if (comp) {
            secSize = $('#' + type + 'sizeField').val();
            if (secSize.length > 0) {
                if (isNaN(Number(secSize))) {
                    window.alert('Section size must be a number.');
                    return false;
                }
                if (Number(secSize) <= 0) {
                    window.alert('Section size must be greater than zero.');
                    return false;
                }
            }
            else {
                window.alert('Please specify a size number.')
                return false;
            }
        }

        // if (!(dept || cNo || cTitle || instr || comp || secSize)) {
        //     window.alert('Please enter something into one of the search fields');
        //     return false;
        // }
        return true;
    }

    function constructSectionQuery() {
        var dept = $('#S_departmentField').val();
        var cNo = $('#S_courseNumberField').val();
        var cTitle = $('#S_courseTitleField').val();
        var instr = $('#S_instructorField').val();
        var comp = $('#S_comparator').val();
        var secSize = $('#S_sizeField').val();

        var query = '{"GET": ["courses_dept", "courses_id", "courses_section", "courses_year", "courses_title", "courses_instructor", "courses_size"], ';
        query += getWhere(dept, cNo, cTitle, instr, comp, secSize);
        query += '"ORDER": {"dir": "UP", "keys": ["courses_dept", "courses_id"]}, "AS": "TABLE"}';

        return query;

    }

    function constructCourseQuery() {
        var dept = $('#C_departmentField').val();
        var cNo = $('#C_courseNumberField').val();
        var cTitle = $('#C_courseTitleField').val();
        var instr = $('#C_instructorField').val();

        var query = '{"GET": ["courses_dept", "courses_id", "courses_title", "MaxSize", "AvgPass", "AvgFail", "AvgSize"], ';
        query += getWhere(dept, cNo, cTitle, instr, null, null);
        query += '"GROUP": ["courses_dept", "courses_id", "courses_title"], ';
        query += '"APPLY": [{"MaxSize": {"MAX": "courses_size"}}, {"AvgPass": {"AVG": "courses_pass"}}, {"AvgFail": {"AVG": "courses_fail"}}, {"AvgSize": {"AVG": "courses_size"}}], ';
        query += '"ORDER": {"dir": "UP", "keys": ["courses_dept", "courses_id"]}, "AS": "TABLE"}';

        return query;
    }

    function getWhere(dept, cNo, cTitle, instr, comp, secSize) {       // add section size functionality
        var components = [];
        var where = '"WHERE": ';
        if (dept) {
            var a = '{"IS": {"courses_dept": "' + dept + '"}}';
            components.push(a);
        }
        if (cNo) {
            var b = '{"IS": {"courses_id": "' + cNo + '"}}';
            components.push(b);
        }
        if (cTitle) {
            var c = '{"IS": {"courses_title": "*' + cTitle + '*"}}';
            components.push(c);
        }
        if (instr) {
            var d = '{"IS": {"courses_instructor": "*' + instr + '*"}}';
            components.push(d);
        }
        if (secSize) {
            var e = '{"' + comp + '": {"courses_size": ' + secSize + '}}';
            components.push(e);
        }

        if (components.length == 0) {
            where += '{"GT": {"courses_year": 1900}},';
        }
        else {
            where += '{"AND": [';
            for (var z = 0; z < components.length; z++) {
                where += components[z] + ', '
            }
            where += '{"GT": {"courses_year": 1900}}]}, '
        }
        return where;
    }


    function makeSectionTable(data) {
        if (Object.keys(data).length == 0) {
            return 'No results were found for the search criteria you entered.'
        }

        var tableContents = '<table id="resultsTable"><thead><tr>';
        // set headings
        Object.keys(data[0]).forEach(function (c) {
            tableContents += '<th>' + getHeading(c) + '</th>';
        });
        tableContents += '</tr></thead><tbody>'
        // set table data
        data.forEach(function (row) {
            var keys = Object.keys(row);
            tableContents += '<tr><td>' + row[keys[0]].toUpperCase() + '</td>' +
                '<td>' + row[keys[1]] + '</td>' +
                '<td>' + row[keys[2]] + '</td>' +
                '<td>' + row[keys[3]] + '</td>' +
                '<td class="cap">' + row[keys[4]] + '</td>' +
                '<td class="cap">' + row[keys[5]] + '</td>' +
                '<td>' + row[keys[6]] + '</td></tr>';
        })
        tableContents += '</tbody></table>';

        return tableContents;
    }

    function makeCourseTable(data) {
        if (Object.keys(data).length == 0) {
            return 'No results were found for the search criteria you entered.'
        }
        // set headings
        var tableContents = '<table id="resultsTable"><thead><tr><th>Department</th><th>Course Number</th><th>Course Title</th><th>Size</th><th>Passes (%)</th><th>Fails (%)</th></tr></thead><tbody>';

        var comp = $('#C_comparator').val();
        var cSize = $('#C_sizeField').val();

        // set table data
        data.forEach(function (row) {
            var keys = Object.keys(row);
            var statement = true;
            if (comp) {
                switch (comp) {
                    case 'GT':
                        statement = row[keys[3]] > cSize;
                        break;
                    case 'EQ':
                        statement = row[keys[3]] == cSize;
                        break;
                    case 'LT':
                        statement = row[keys[3]] < cSize;
                        break;
                }
            }

            if (statement) {
                tableContents += '<tr><td>' + row[keys[0]].toUpperCase() + '</td>' +
                    '<td>' + row[keys[1]] + '</td>' +
                    '<td class="cap">' + row[keys[2]] + '</td>' +
                    '<td>' + row[keys[3]] + '</td>' +
                    '<td>' + Math.round((Number(row[keys[4]]) / Number(row[keys[6]])) * 100) + '</td>' +
                    '<td>' + Math.round((Number(row[keys[5]]) / Number(row[keys[6]])) * 100) + '</td></tr>';
            }
        });
        tableContents += '</tbody></table>';
        return tableContents;
    }

    function getHeading(str) {
        switch (str) {
            case 'courses_dept':
                return 'Department';
            case 'courses_id':
                return 'Course ID';
            case 'courses_title':
                return 'Course Title';
            case 'courses_instructor':
                return 'Instructor';
            case 'courses_size':
                return 'Section Size';
            case 'courses_section':
                return 'Section Number';
            case 'courses_year':
                return 'Year';
            case 'AVG':
                return 'Course Average';
            case 'PASS':
                return 'Number of Students Who Passed the Course';
            case 'FAIL':
                return 'Number of Students Who Failed the Course';
            default:
                return str;
        }
    }
});

function initializeUIElements() {
    $("#tabsOuter").tabs();

    $("#s_comparator").selectmenu();
    $("#s_comparator").val("");
    $('#s_comparator').selectmenu("refresh");

    $("#c_comparator").selectmenu();
    //$("#c_comparator").val("");
    //$('#c_comparator').selectmenu("refresh");

    $("#submitSectionQuery").button();
    $("#submitCourseQuery").button();
}



