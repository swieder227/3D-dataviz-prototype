var container, scene, renderer, camera, controls, stats, all_graphs = [];

var grid_dimensions = {
  width: 50,
  height: 15,
  depth: 20
}

function initialize(){

  // Container
  container = document.getElementById('container');

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xffffff );

  // Renderer
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );

  // Camera
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  controls = new THREE.OrbitControls( camera, renderer.domElement );

  camera.position.x = -20.121462510502194;
  camera.position.y = 18.555448009147472;
  camera.position.z = -22.8506389194440;


  // Helper
  var axis_helper = new THREE.AxisHelper( 5 );
  axis_helper.position.z = -30;
  scene.add(axis_helper);

  // Stats
  stats = new Stats();
  container.appendChild(stats.dom);

  // Graphs
  setupAllGrids();
  all_graphs.push(createGraphPlane(data_brexit_gbp, [0, 6]));
  all_graphs.push(createGraphPlane(data_brexit_uk, [0, 6], 0xFF00FF));
  all_graphs.push(createGraphPlane(data_test, [0, 10]));
  addCurrentGraphsToScene();

}

/**
 *
 * Sets up the 3D graph axis/grids
 * Creates multiple grids, adds to global scene
 */
function setupAllGrids(){

  let grid_object = new THREE.Object3D();
  grid_object.name = "graph-grid";

  let grid_xy = createGrid({
    width: grid_dimensions.height,
    height: grid_dimensions.width,
    linesHeight: 10,
    linesWidth: 10,
    color: 0x0000FF
  });
  grid_xy.position.z = grid_dimensions.depth;

  let grid_xz = createGrid({
    width: grid_dimensions.depth,
    height: grid_dimensions.width,
    linesHeight: 10,
    linesWidth: 10,
    color: 0xFF0000
  });
  grid_xz.rotateX(Math.PI / 2);
  grid_xz.position.y = -1 * grid_dimensions.height;

  let grid_yz = createGrid({
    width: grid_dimensions.height,
    height: grid_dimensions.depth,
    linesHeight: 10,
    linesWidth: 10,
    color: 0x00FF00
  });
  grid_yz.position.x = -1 * grid_dimensions.width;
  grid_yz.rotateY(Math.PI / 2);

  grid_object.add( grid_xy ).add( grid_xz ).add( grid_yz );
  grid_object.position.y = grid_dimensions.height;
  scene.add( grid_object );
}

/**
 *
 * Create a rectangular grid in 3D space
 * @param  {Object} options - config to describe the grid
 * @return {THREE.Object3D} the THREE.js object
 */
function createGrid(options){
  let config = options || {
    height: 50,
    width: 50,
    linesHeight: 50,
    linesWidth: 10,
    color: 0xDD006C
  }

  let material = new THREE.LineBasicMaterial({
    color: config.color,
    opacity: 0.2
  });

  let grid_object = new THREE.Object3D(),
      grid_geo = new THREE.Geometry(),
      stepw = 2 * config.width / config.linesWidth,
      steph = 2 * config.height / config.linesHeight;

  //width
  for ( var i = - config.width; i <= config.width; i += stepw ) {
      grid_geo.vertices.push( new THREE.Vector3( -config.height, i, 0 ) );
      grid_geo.vertices.push( new THREE.Vector3( config.height, i, 0 ) );

  }
  //height
  for ( var i = - config.height; i <= config.height; i += steph ) {
      grid_geo.vertices.push( new THREE.Vector3( i, -config.width, 0 ) );
      grid_geo.vertices.push( new THREE.Vector3( i, config.width, 0 ) );
  }

  var line = new THREE.LineSegments(grid_geo, material, THREE.LinePieces);
  grid_object.add(line);
  grid_object.name = "single-grid"

  return grid_object;
}

/**
 *
 * Map a given value from one range to the same value in another range
 * @param  {Array} from - current range of values [0,100] => 0, 1, 2... 100
 * @param  {Array} to - desired range of values [0,1] => 0, 0.1, 0.2 ... 1
 * @param  {Number} s - input value
 * @return {Number} new value within `to` range
 */
function mapRange(from, to, s) {
  return to[0] + (s - from[0]) * (to[1] - to[0]) / (from[1] - from[0]);
};

/**
 *
 * Draw a 3D Area Graph and to scene
 * @param  {Array} data - array of data points in format [ [X,Y], [X,Y], ... ]
 * @param  {Array} min_max_range - two entries [0] = min = floor of graph, [1] = max = ceiling of graph
 * @param  {Number} color - hex number to set color of graph material
 * @return {THREE.Mesh} the THREE.js object ready for scene.add()
 */
function createGraphPlane(data = [], min_max_range = [0, 1], color = 0x2A88A5 ){

  // Dimensions and positioning of the Object3D
  let graph_width = grid_dimensions.width * 2,
      graph_height = grid_dimensions.height * 2,
      graph_y_offset = grid_dimensions.height;

  // Geometry.
  // widthSegments param == data.length - 1, so each vertex represents a point.
  var graph_geometry = new THREE.PlaneGeometry( graph_width, graph_height, data.length - 1, 1 );

  // temp global for debugging. TODO remove.
  window.graph_geometry = graph_geometry;

  // loop over verticies and set their y value to data point
  let data_length = data.length;
  for (var i = 0; i < data_length; i++) {

    // get data point
    let data_point = data[i][1];

    // calculate the position within graph space based on data_point
    // mapRange() scales two ranges, data range <=> graph range
    // subtract graph_y_offset to position geometry on graph
    // TODO check perf. consider underscore or d3
    let relative_position_y = mapRange([ min_max_range[0], min_max_range[1]], [0, graph_height], data_point) - graph_y_offset;

    // verticies[0] is last point on x axis, verticies[data.length - 1] is the first
    let vertex = graph_geometry.vertices[(data_length - 1) - i];

    // set the y position of vertex
    vertex.y = relative_position_y;

    // save reference for value
    vertex.value = data_point;
  }

  // material
  var material = new THREE.MeshBasicMaterial( {color: color, side: THREE.DoubleSide} );

  // bundle geo + material
  var graph_obj = new THREE.Mesh( graph_geometry, material );
  graph_obj.position.y = graph_y_offset;

  return graph_obj;
}

/**
 *
 * Iterates over `all_graphs`,
 * positions them in z-space
 * add them to the global `scene`
 */
function addCurrentGraphsToScene(){

  // ammount of space between graphs
  let between_offset = 5;

  // iterate over all graphs
  for (var i = 0; i < all_graphs.length; i++) {

    // set position
    let position_zed = -all_graphs.length + (between_offset * i);
    all_graphs[i].position.z = position_zed;

    // add to scene
    scene.add(all_graphs[i]);

  }
}


function animate(){
  requestAnimationFrame( animate );
  controls.update();
  stats.update();
  render();
}


// render loop to re-draw frame 60 times per second
function render() {
  renderer.render( scene, camera );
}

initialize();
animate();
