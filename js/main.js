var container, scene, renderer, camera, controls, stats, grid_object, all_graphs = [];

/**
 * The relative size of the grid/graph in 3D world dimensions
 * @type {Object}
 */
const grid_dimensions = {
  width: 50,
  height: 15,
  depth: 20
}

/**
 * All colors to iterate over when drawing graph planes
 * @type {Array} of hex colors
 */
const GRAPH_COLORS = [0x5E648C, 0x98B9DA, 0x7EA992, 0xA4CBCF];

/**
 * All data to graph a PIMCO story
 * @type {Array} An array of data sets
 * @type {Array} data[x][0] - array of data values with [date,value]
 * @type {Array} data[x][1] - two value array with min/max values for createGraphPlane()
 */
const DATA_BREXIT = [[data_brexit_usd, [0,90]], [data_brexit_gbp, [0,90]], [data_brexit_uk, [0,90]], [data_brexit_vix, [0,90]]];
const DATA_HOUSING = [[data_housing_usfed, [0,500]], [data_housing_spcs, [0,500]], [data_housing_sp500, [0,500]]];
const DATA_MONETARY = [[data_monetary_10yr, [0,100]], [data_monetary_usfedfunds, [0,100]], [data_monetary_unemploy, [0,100]], [data_monetary_fedreserve, [0,4750000]]];
const DATA_OIL = [[data_oil, [0,150]]]


/**
 * Init all ThreeJS components
 */
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
  // size is set as the graph dimensions w/ padding
  let view_size = Math.max(grid_dimensions.width * 1.5, grid_dimensions.height * 1.5);
  let aspect = window.innerWidth / window.innerHeight;

  camera = new THREE.OrthographicCamera( -aspect*view_size / 2, aspect*view_size / 2, view_size / 2, -view_size / 2, -1000, 1000 );
  controls = new THREE.OrbitControls( camera, renderer.domElement );

  camera.position.z = -1;

  /*// Helper
  var axis_helper = new THREE.AxisHelper( 5 );
  axis_helper.position.z = 40;
  scene.add(axis_helper);*/

  // Stats
  stats = new Stats();
  container.appendChild(stats.dom);

  // Graphs
  grid_object = setupAllGrids();

  // Data
  setupGraphsForStory(DATA_BREXIT);
  // setupGraphsForStory(DATA_HOUSING);
  // setupGraphsForStory(DATA_MONETARY);
  // setupGraphsForStory(DATA_OIL);
}

/**
 * Sets up the 3D graph axis/grids
 * Creates multiple grids, adds to global scene
 * @return {THREE.Object3D} the parent THREE.js object
 */
function setupAllGrids(){

  let grid_object = new THREE.Object3D();
  grid_object.name = "graph-grid";

  // Back
  let grid_xy = createGrid({
    width: grid_dimensions.height,
    height: grid_dimensions.width,
    linesHeight: 5,
    linesWidth: 5,
    color: 0xDEDEE0, /*0x0000FF*/
  });
  grid_xy.position.z = grid_dimensions.depth;

  // Floor
  let grid_xz = createGrid({
    width: grid_dimensions.depth,
    height: grid_dimensions.width,
    linesHeight: 10,
    linesWidth: 1,
    color: 0xDEDEE0, /*0xFF0000*/
  });
  grid_xz.rotateX(Math.PI / 2);
  grid_xz.position.y = -1 * grid_dimensions.height;

  // Side
  let grid_yz = createGrid({
    width: grid_dimensions.height,
    height: grid_dimensions.depth,
    linesHeight: 1,
    linesWidth: 5,
    color: 0xDEDEE0, /*0x00FF00*/
  });
  grid_yz.position.x = -1 * grid_dimensions.width;
  grid_yz.rotateY(Math.PI / 2);

  grid_object.add( grid_xy ).add( grid_xz ).add( grid_yz );
  grid_object.position.y = grid_dimensions.height;
  scene.add( grid_object );

  return grid_object;
}

/**
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
    opacity: 0.2,
    linewidth: 2
  });

  let grid_geo = new THREE.Geometry(),
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

  var grid_object = new THREE.LineSegments(grid_geo, material, THREE.LinePieces);
  grid_object.name = "single-grid"

  return grid_object;
}

/**
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
 * Draw a 3D Area Graph and add to scene
 * @param  {Array} data - array of data points in format [ [X,Y], [X,Y], ... ]
 * @param  {Array} min_max_range - two entries [0] = min = floor of graph, [1] = max = ceiling of graph
 * @param  {Number} color - hex number to set color of graph material
 * @return {THREE.Mesh} the THREE.js object ready for scene.add()
 */
function createGraphPlane(data = [], min_max_range = [0, 1], color = COLOR_BLUE_DARK ){

  // Dimensions and positioning of the Object3D
  let graph_width = grid_dimensions.width * 2,
      graph_height = grid_dimensions.height * 2,
      graph_y_offset = grid_dimensions.height;

  // Geometry.
  // widthSegments param == data.length - 1, so each vertex represents a point.
  var graph_geometry = new THREE.PlaneGeometry( graph_width, graph_height, data.length - 1, 1 );

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
 * Iterates over `all_graphs`,
 * positions them in z-space
 * add them to the global `scene`
 */
function addCurrentGraphsToScene(){

  // ammount of space between graphs
  let between_offset = 3;

  // iterate over all graphs
  for (var i = 0; i < all_graphs.length; i++) {

    // set position
    let position_zed = -all_graphs.length + (between_offset * i);
    all_graphs[i].position.z = position_zed;

    // add to scene
    scene.add(all_graphs[i]);

  }
}

/**
 * Remove all 3D graphs from the scene,
 * Reset `all_graphs`
 */
function removeCurrentGraphsFromScene(){
  for (var i = all_graphs.length - 1; i >= 0; i--) {
    scene.remove(all_graphs[i]);
  }
  all_graphs = [];
}

/**
 * Reset `scene` and draw graphs for a story
 * @param {Array} dataset - constant array of static data
 * @param {Array} data[x][0] - array of data values with [date,value]
 * @param {Array} data[x][1] - two value array with min/max values for createGraphPlane()
 */
function setupGraphsForStory(dataset){
  removeCurrentGraphsFromScene();
  dataset.forEach(function(data, index){
      all_graphs.push(createGraphPlane(data[0], data[1], GRAPH_COLORS[index]));
  });
  addCurrentGraphsToScene();
}

// animation loop
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
