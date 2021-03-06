//global variables
var markers = [];
var infoWindows = [];
var geocode;
var geocodeData = [];
var map;


// Firebase
// Initialize Firebase
var config = {
  apiKey: "AIzaSyBL7eL1YZG4_5J1khX_taIydR_rlHp2KaM",
  authDomain: "austin-geocode.firebaseapp.com",
  databaseURL: "https://austin-geocode.firebaseio.com",
  storageBucket: "",
  messagingSenderId: "319957683456"
};

firebase.initializeApp(config);

var fb = firebase.database().ref();

fb.on('child_added', function(snapshot) {
  geocodeData.push(snapshot.val());
});

function searchGeocode(address) {

  var coord;

  if(geocodeData) {
    Object.keys(geocodeData).forEach(function(key) {
      if(geocodeData[key].address === address) {
        coord = {
          lat: geocodeData[key].lat,
          lng: geocodeData[key].lng
        };

        return;
      }
    });
  }

  return coord;
}

// End Firebase

// Start Map
var mapArray = {
    selectIcon: function(incident) {

        var category = data.getCategory(incident);
        var path = 'assets/images/';
        var icon;
        
        switch(category) {
          case 'violent' :
            icon = 'shooting.png';
            break;
          case 'property' :
            icon = 'house.png';
            break;
          case 'theft' :
            icon = 'robbery.png';
            break;
          case 'accident' :
            icon = 'caraccident.png';
            break;
          case 'drugs' :
            icon = 'marijuana.png';
            break;
        }

        return icon ? path+icon : icon;
    },
    convertTime: function(time) {
        var hours = '',
            minutes = '',
            displayTime = '',
            military = '';
        if (time.length == 3) {
            hours = 0 + time.charAt(0).toString();
            minutes = time.substring(1, 3).toString();
            military = hours + minutes;
        } else if (time.length == 4) {
            hours = time.substring(0, 2).toString();
            minutes = time.substring(2, 4).toString();
            military = hours + minutes;
        } else if (time.length == 2) {
            hours = '00';
            minutes = time.substring(0, 2).toString();
            military = hours + minutes;
        }
        hours24 = parseInt(military.substring(0, 2), 10);
        var hour = ((hours24 + 11) % 12) + 1;
        var amPm = hours24 > 11 ? 'pm' : 'am';
        minutes = military.substring(2);
        displayTime = hour + ':' + minutes + amPm;
        return displayTime;
    },

    createContentString: function(incident, time) {
        var info = '<div id="content">' + '<div id="bodyContent">' + '<p><b>Incident: </b>' + incident.crime_type + '</p>' + '<p><b>Address: </b>' + incident.address + '</p>' + '<p><b>Date: </b>' + incident.date.split("T")[0] + '</p>' +
            '<p><b>Report Number: </b>' + incident.incident_report_number + '</p>' + '<p><b>Time: </b>' + time + '</p>' + '</div>' + '</div>';
        return info;
    }
};

//This function will display the map
function initMap() {
    //variable to create the google maps geocoder to be use to change from an address to a lng and lat.
    geocode = new google.maps.Geocoder();

    //variable for the min zoom level to use on google maps
    var minZoomLevel = 10;

    //variable to create google maps
    map = new google.maps.Map(document.getElementById('map'), {
        center: new google.maps.LatLng(30.31, -97.75),
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: true,
        zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM
    },
    });

    //variable to create the strict bonds for Austin map
    var strictBounds = new google.maps.LatLngBounds(new google.maps.LatLng(30.115207, -98.183280), new google.maps.LatLng(30.560853, -97.338706));

    //listener for dragend to limit the view are of the map
    google.maps.event.addListener(map, 'dragend', function() {
        if (strictBounds.contains(map.getCenter())) return;
        // We're out of bounds - Move the map back within the bounds
        var c = map.getCenter(),
            x = c.lng(),
            y = c.lat(),
            maxX = strictBounds.getNorthEast().lng(),
            maxY = strictBounds.getNorthEast().lat(),
            minX = strictBounds.getSouthWest().lng(),
            minY = strictBounds.getSouthWest().lat();
        if (x < minX) x = minX;
        if (x > maxX) x = maxX;
        if (y < minY) y = minY;
        if (y > maxY) y = maxY;
        map.setCenter(new google.maps.LatLng(y, x));
    });

    //listener to limit the zoom on the map
    google.maps.event.addListener(map, 'zoom_changed', function() {
        if (map.getZoom() < minZoomLevel) {
            map.setZoom(11);
        }
    });

}

function setMapOnAll(map) {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
    }
}

function clearMarkers() {
    setMapOnAll(null);
}

function deleteMarkers() {
    clearMarkers();
    markers = [];
}

function createMarkers(incidentAddress, incidentWindow, category) {
    var address = incidentAddress + ", Austin, TX";
    infoWindows.push(incidentWindow);

    var coord = searchGeocode(incidentAddress);

    if(coord) {
      addMarker(new google.maps.LatLng(coord.lat, coord.lng), incidentWindow, category);
    } else {
      geocode.geocode({
          'address': address
      }, function(results, status) {
          if (status === 'OVER_QUERY_LIMIT') {
              setTimeout(function() {
                  createMarkers(incidentAddress, incidentWindow, category);
              }, 200);
          }
          if (status === 'OK') {
              addMarker(results[0].geometry.location, incidentWindow, category);
              fb.push({
                address: incidentAddress,
                lat: results[0].geometry.location.lat(),
                lng: results[0].geometry.location.lng()
              });
          }
      });
    }

}

function addMarker(latlng, incidentWindow, category) {
  var image = mapArray.selectIcon(category);

  var marker = new google.maps.Marker({
      map: map,
      icon: image,
      position: latlng
  });
  marker.addListener('click', function() {
      for (var i = 0; i < infoWindows.length; i++) {
          infoWindows[i].close();
      }
      incidentWindow.open(map, marker);
  });

  markers.push(marker);
}

function plotMarkers(arrayToPlot) {
    deleteMarkers();
    for (i = 0; i < arrayToPlot.length; i++) {
        var key = arrayToPlot;
        key[i].address = key[i].address.replace("BLOCK ", "");
        var time = mapArray.convertTime(key[i].time);
        var contentString = mapArray.createContentString(key[i], time);
        var incidentWindow = new google.maps.InfoWindow({
            content: contentString
        });
        createMarkers(key[i].address, incidentWindow, key[i].crime_type);
    }
}
