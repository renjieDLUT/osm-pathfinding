var iterationsPerLoop = 1;
var maxFreshDots = 20;

var locs = {
  home: { name: 'Triangle Fraternity', node: '33308096' },
  keller: { name: 'Keller Hall', node: '244111945' }
};

var style = {

  icon: {
    node: L.AwesomeMarkers.icon({
      icon: 'circle-o',
      markerColor: 'cadetblue',
      prefix: 'fa'
    }),
    favorite: L.AwesomeMarkers.icon({
      icon: 'star',
      markerColor: 'blue',
      prefix: 'fa'
    }),
    start: L.AwesomeMarkers.icon({
      icon: 'flag-o',
      markerColor: 'green',
      prefix: 'fa'
    }),
    goal: L.AwesomeMarkers.icon({
      icon: 'flag-checkered',
      markerColor: 'red',
      prefix: 'fa'
    })
  },

  dot: {
    aged: {color: 'blue', opacity: 0.2},
    fresh: {color: '#ff4400', opacity: 1}
  },

  path: {
    final: {color: 'red', opacity: 0.5}
  }

};

var map = L.mapbox.map('map', 'mplewis.hjdng7eb');
var markers = new L.MarkerClusterGroup();

function nodeCoords(node) {
  var coords;
  var reqUrl = 'http://localhost:7379/GET/node:' + node;
  $.ajax({
    url: reqUrl,
    dataType: 'json',
    async: false,
    success: function(data) {
      coords = data.GET.split(':').map(function(coord) { return parseFloat(coord); });
    }
  });
  return coords;
}

function adjNodes(node) {
  var adj;
  var reqUrl = 'http://localhost:7379/SMEMBERS/nodeadj:' + node;
  $.ajax({
    url: reqUrl,
    dataType: 'json',
    async: false,
    success: function(data) {
      adj = data.SMEMBERS;
    }
  });
  return adj;
}

function distLatLon(latlonA, latlonB) {
  return Math.sqrt(Math.pow(latlonB[0] - latlonA[0], 2) + Math.pow(latlonB[1] - latlonA[1], 2));
}

function distNodes(nodeA, nodeB) {
    return distLatLon(nodeCoords(nodeA), nodeCoords(nodeB));
}

function reconstructPath(cameFrom, currentNode) {
  if (currentNode in cameFrom) {
    return reconstructPath(cameFrom, cameFrom[currentNode]).concat(currentNode);
  } else {
    return [currentNode];
  }
}

function astar(start, goal) {
  L.marker(nodeCoords(start), {icon: style.icon.start}).addTo(map);
  L.marker(nodeCoords(goal), {icon: style.icon.goal}).addTo(map);
  var closedSet = {};
  var openSet = {};
  openSet[start] = true;
  var openSetCount = 1;
  var cameFrom = {};

  var gScore = {};
  gScore[start] = 0;

  var fScore = {};
  fScore[start] = gScore[start] + distNodes(start, goal);

  var circles = [];

  var whileLoop = setInterval(function() {
    for (var iterations = 0; iterations < iterationsPerLoop; iterations++) {
      if (openSetCount < 1) {
        clearInterval(whileLoop);
        throw 'No path found from ' + start + ' to ' + goal;
      }
      var openSetUnsorted = _.keys(openSet);
      var openSetSortedF = openSetUnsorted.sort(function(a, b) { return fScore[a] - fScore[b]; });
      var current = openSetSortedF[0];
      var circle = L.circle(nodeCoords(current), 1, style.dot.fresh).addTo(map);
      circles.push(circle);
      while (circles.length > maxFreshDots) {
        circles.shift().setStyle(style.dot.aged);
      }
      if (current == goal) {
        clearInterval(whileLoop);
        circles.forEach(function(circle) {
          circle.setStyle(style.dot.aged);
        });
        var path = reconstructPath(cameFrom, goal);
        L.polyline(path.map(nodeCoords), style.path.final).addTo(map);
        return path;
      }

      delete openSet[current];
      openSetCount--;
      closedSet[current] = true;
      var adj = adjNodes(current);
      for (var i = 0; i < adj.length; i++) {
        var neighbor = adj[i];
        if (neighbor in closedSet) {
          continue;
        }
        tentativeGScore = gScore[current] + distNodes(current, neighbor);
        if (!(neighbor in openSet) || tentativeGScore < gScore[neighbor]) {
          cameFrom[neighbor] = current;
          gScore[neighbor] = tentativeGScore;
          fScore[neighbor] = gScore[neighbor] + distNodes(neighbor, goal);
          if (!(neighbor in openSet)) {
            openSet[neighbor] = true;
            openSetCount++;
          }
        }
      }
    }
  }, 0);
}

astar(locs.home.node, locs.keller.node);
