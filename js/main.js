var container, scene, renderer, camera, controls, stats;

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
  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );

  // Camera
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  controls = new THREE.OrbitControls( camera, renderer.domElement );

  camera.position.z = -28;
  camera.position.x = 55;
  camera.position.y = 55;

  // Helper
  var axis_helper = new THREE.AxisHelper( 5 );
  axis_helper.position.z = -30;
  scene.add(axis_helper);

  // Stats
  stats = new Stats();
  container.appendChild(stats.dom);

  // Graphs
  setupGraphGrids();
  drawGraph();
}

/**
 *
 * Sets up the 3D graph axis/grids
 * Creates multiple grids, adds to global scene
 */
function setupGraphGrids(){

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

var graph_geometry; // temp global for debugging
function drawGraph(){

  // temp
  let data = data_brexit;
  let data_max = 2;

  let graph_width = grid_dimensions.width * 2,
      graph_height = grid_dimensions.height * 2,
      graph_y_offset = grid_dimensions.height;

  graph_geometry = new THREE.PlaneGeometry( graph_width, graph_height, data.length / 2, 1 );

  // Gets the # of verts in 1st half of plane
  // 1/2 verts of plane are top, 1/2 verts of plane are bottom
  let vert_length = Math.floor((graph_geometry.vertices.length - 1) / 2)

  // loop over verticies and set their y value to data point
  for (var i = vert_length; i >= 0; i--) {
    let data_point = data[i][1];

    // mapRange() scales the data to match the range of the graph
    // subtract graph_y_offset to position geometry on graph
    // TODO check perf. consider underscore or d3
    let relative_position = mapRange([0, data_max], [0, graph_height], data_point) - graph_y_offset;
    graph_geometry.vertices[i].y = relative_position;
  }


  // material
  var material = new THREE.MeshBasicMaterial( {color: 0x000000, wireframe: true} );

  // add to scene
  var plane = new THREE.Mesh( graph_geometry, material );
  plane.position.y = graph_y_offset;

  scene.add(plane);
}

function animate(){
  requestAnimationFrame( animate );
  controls.update();
  render();
  stats.update();
}


// render loop to re-draw frame 60 times per second
function render() {
  renderer.render( scene, camera );
}

initialize();
animate();
