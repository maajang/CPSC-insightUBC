/**
 * Created by Kirsten on 2016-11-30.
 */





function initDialog(abbr) {
    console.log('starting initDialog ' + abbr);

    return getCoords(abbr).then(function (coords) {

        var place = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=-33.8670522,151.1957362&radius=500&type=restaurant&keyword=cruise&key=AIzaSyCcn_l9tSA5l2-TjAVgtdyaLjfz4k-mGwE';


        var mapURL = 'https://www.google.com/maps/embed/v1/place?key=AIzaSyDeBrXpuBl2CyOos3ZWaFQSa01_AW9YNjY&q=' + coords['Lat'] + ',' + coords['Lng'];

        $('#mapFrame').attr('src', mapURL);

        var thisBuilding = new google.maps.LatLng(Number(coords['Lat']), Number(coords['Lng']));

        setUpDistanceTab(coords['Name']);

        $('#buildingDialog').attr('title', coords['Name'] + ' - ' + abbr);
        localStorage.setItem('abbr', abbr);
        console.log('stored ' + localStorage.getItem('abbr'));



        console.log('about to open');
        $('#buildingDialog').dialog("open");
    });

}

// source: https://developers.google.com/maps/documentation/javascript/examples/place-search
/*function createCoffeeMap(thisBuilding) {

    return new Promise(function (fulfill, reject) {

        var coffeeMap;
        var coffeeService;
        var infowindow;

        coffeeMap = new google.maps.Map(document.getElementById('coffeeMap'), {
            center: thisBuilding,
            zoom: 15
        });

        google.maps.event.addListenerOnce(coffeeMap, 'idle', function () {
            google.maps.event.trigger(coffeeMap, 'resize');
            coffeeMap.setCenter(thisBuilding);
        });

        var coffeeRequest = {
            location: thisBuilding,
            radius: '500',
            keyword: 'coffee'
        };
        coffeeService = new google.maps.places.PlacesService(coffeeMap);
        coffeeService.nearbySearch(coffeeRequest, coffeeCallback);


        function coffeeCallback(results, status) {
            console.log('callback');
            if (status == google.maps.places.PlacesServiceStatus.OK) {
                for (var i = 0; i < results.length; i++) {
                    console.log(results[i]);
                    createMarker(results[i]);
                }
                console.log('all markers created');
                fulfill();
            }
        }

        function createMarker(place) {
            var placeLoc = place.geometry.location;
            var marker = new google.maps.Marker({
                map: coffeeMap,
                position: place.geometry.location
            });

            google.maps.event.addListener(marker, 'click', function () {
                infowindow.setContent(place.name);
                infowindow.open(coffeeMap, this);
            });
        }
    });
}*/


function getCoords(abbr) {
    console.log('starting getCoords');

    return new Promise(function (fulfill, reject) {

        var query = '{"GET": ["rooms_lat", "rooms_lon", "rooms_address", "rooms_fullname"], "WHERE": {"IS": {"rooms_shortname": "' + abbr + '"}}, "AS": "TABLE"}';

        try {
            $.ajax("/query", {
                type: "POST",
                data: query,
                contentType: "application/json",
                dataType: "json",
                success: function (data) {
                    if (data["render"] === "TABLE") {
                        var coords = data["result"][0];
                        coordsObject = {
                            Lat: coords['rooms_lat'],
                            Lng: coords['rooms_lon'],
                            Name: coords['rooms_fullname'],
                            Address: coords['rooms_address']
                        };
                        // assign address to correct div

                        document.getElementById('buildingAddress').innerHTML = 'Address: ' + coords['rooms_address'];

                        localStorage.setItem('lat', coords['rooms_lat']);
                        localStorage.setItem('lon', coords['rooms_lon']);

                        fulfill(coordsObject);

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

function setUpDistanceTab(name) {
    document.getElementById('description').innerHTML = 'Calculate the time required to walk from <b>' + name + '<b> to:'
}


function findDistance(target, abbrev, abbrevLat, abbrevLon) {


    var query = '{"GET": ["rooms_lat", "rooms_lon"], "WHERE": {"IS": {"rooms_shortname": "' + target + '"}}, "AS": "TABLE"}';
    console.log(query);

    try {
        $.ajax("/query", {
            type: "POST",
            data: query,
            contentType: "application/json",
            dataType: "json",
            success: function (data) {
                if (data["render"] === "TABLE") {
                    var coords = data["result"][0];

                    var targetLat = coords['rooms_lat'];
                    var targetLon = coords['rooms_lon'];

                    var service = new google.maps.DistanceMatrixService(document.createElement('div'));
                    service.getDistanceMatrix({
                        origins: [{lat: abbrevLat, lng: abbrevLon}],
                        destinations: [{lat: targetLat, lng: targetLon}],
                        travelMode: 'WALKING',
                        unitSystem: google.maps.UnitSystem.METRIC
                    }, function (response, status) {
                        if (status == 'OK') {
                            window.alert('The distance from ' + abbrev + ' to ' + target + ' is ' + response['rows'][0]['elements'][0]['distance']['text'] + '. The walk will take ' + response['rows'][0]['elements'][0]['duration']['text'] + '.');
                        }
                    });
                }
            },
        }).fail(function (e) {
            console.log('problem: ' + JSON.stringify(e));

        });
    } catch (err) {
        console.log("Query Error", err);

    }
}