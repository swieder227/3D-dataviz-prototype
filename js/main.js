var container, scene, renderer, camera, controls, stats, grid_object, all_graphs = [], all_labels = [];

/**
 * The relative size of the grid/graph in 3D world dimensions
 * @type {Object}
 */
const GRID_DIMENSIONS = {
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
const DATA_BREXIT = [ [data_brexit_gbp, [0,15]], [data_brexit_vix, [0,150]], [data_brexit_uk, [0,15]], [data_brexit_msci, [0,150]] ];
const DATA_HOUSING = [ [data_housing_usfed, [-1,60]], [data_housing_abx, [0,600]], [data_housing_spcs, [0,600]],[data_housing_sp500, [0,600]] ];
const DATA_MONETARY = [ [data_monetary_10yr, [0,50]], [data_monetary_usfedfunds, [-1,50]],  [data_monetary_unemploy, [0,50]], [data_monetary_fedreserve, [0,5000000]] ];
const DATA_CHINA = [ [data_china_gdp, [0, 60]], [data_china_sp500, [0, 6000]], [data_china_cny, [0, 0.6]], [data_china_shanghai, [0, 6000]] ];
const DATA_OIL = [ [data_oil_opec, [0, 150000]], [data_oil_non_opec, [0, 150000]], [data_oil_msci, [0,1500]], [data_oil_crude, [0, 150]] ];

/**
 * X/Y Axis labels per PIMCO story
 * @type {Array} An array with two or three entries
 * @type {Array} label[0] - An array of labels for the X axis
 * @type {Array} label[1] - An array of labels for the Y axis
 */
const LABELS_BREXIT = [ [2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016], [0, 5, 10, 15] ];
const LABELS_HOUSING = [ [2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016], [0, 1, 2, 3, 4, 5, 6] ];
const LABELS_MONETARY = [ [2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016], [0, 10, 20, 30, 40, 50] ];
const LABELS_CHINA = [ [2000, 2003, 2006, 2009, 2012, 2015, 2018, 2021], [0, 1, 2, 3, 4, 5, 6] ];
const LABELS_OIL = [ [2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016], [0, 3, 6, 9, 12, 15] ];

/**
 * Default camera positions
 * @type {THREE.Vector3} { x, y, z }
 */
const POSITION_2D = new THREE.Vector3(0, 0, -1);
const POSITION_3D = new THREE.Vector3(0.8, 0.55, -1);

/**
 * Init all ThreeJS components
 */
function initialize(){

  // Container
  container = document.getElementById('container');

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xffffff );
  // centers vertically
  scene.position.y = -GRID_DIMENSIONS.height / 2;

  // Renderer
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );

  // Camera
  // size is set as the graph dimensions w/ padding
  let view_size = Math.max(GRID_DIMENSIONS.width * 1.5, GRID_DIMENSIONS.height * 1.5);
  let aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.OrthographicCamera( -aspect*view_size / 2, aspect*view_size / 2, view_size / 2, -view_size / 2, -1000, 1000 );

  //zoom
  camera.zoom = 0.85;
  camera.updateProjectionMatrix();
  // position
  camera.position.x = POSITION_3D.x;
  camera.position.y = POSITION_3D.y;
  camera.position.z = POSITION_3D.z;

  // Controls
  controls = new THREE.OrbitControls( camera, renderer.domElement );
  // controls.enabled = false;

  /*// Helper
  var axis_helper = new THREE.AxisHelper( 5 );
  axis_helper.position.z = 40;
  scene.add(axis_helper);*/

  // Stats
  stats = new Stats();
  container.appendChild(stats.dom);

  // Graphs, Data, Labels
  setupGraphsForStory(DATA_BREXIT, LABELS_BREXIT);

}

/**
 * Animates camera position to provided coordinates
 * @param {THREE.Vector3} position_vector - x/y/z coordinates
 * @param {Number} anim_duration - length of animation in ms
 */
function animateCameraPosition(position_vector, anim_duration = 1000){

  let ease_curve = TWEEN.Easing.Cubic.Out;

  // tween camera position
  let tween = new TWEEN.Tween(camera.position)
      .to({ x: position_vector.x, y: position_vector.y, z: position_vector.z }, anim_duration)
      .easing(ease_curve)
      .start();

  // if we pan the controls, the center is off, and must be reset.
  let tween2 = new TWEEN.Tween(controls.target)
      .to({ x: 0, y: 0, z: 0 }, anim_duration)
      .easing(ease_curve)
      .start();
}

/**
 * Sets up the 3D graph axis/grids
 * Creates multiple grids, adds to global scene
 * @return {THREE.Object3D} the parent THREE.js object
 */
function setupAllGrids(x_axis_label_length, y_axis_label_length){

  let grid_object = new THREE.Object3D();
  grid_object.name = "graph-grid";

  let x_axis_label_num = x_axis_label_length - 1;
  let y_axis_label_num = y_axis_label_length - 1;

  // Back
  let grid_xy = createGrid({
    width: GRID_DIMENSIONS.height,
    height: GRID_DIMENSIONS.width,
    linesHeight: x_axis_label_num,
    linesWidth: y_axis_label_num,
    color: 0xDEDEE0, /*0x0000FF*/
  });
  grid_xy.position.z = GRID_DIMENSIONS.depth;

  // Floor
  let grid_xz = createGrid({
    width: GRID_DIMENSIONS.depth,
    height: GRID_DIMENSIONS.width,
    linesHeight: x_axis_label_num,
    linesWidth: 1,
    color: 0xDEDEE0, /*0xFF0000*/
  });
  grid_xz.rotateX(Math.PI / 2);
  grid_xz.position.y = -1 * GRID_DIMENSIONS.height;

  // Side
  let grid_yz = createGrid({
    width: GRID_DIMENSIONS.height,
    height: GRID_DIMENSIONS.depth,
    linesHeight: 1,
    linesWidth: y_axis_label_num,
    color: 0xDEDEE0, /*0x00FF00*/
  });
  grid_yz.position.x = -1 * GRID_DIMENSIONS.width;
  grid_yz.rotateY(Math.PI / 2);

  grid_object.add( grid_xy ).add( grid_xz ).add( grid_yz );
  grid_object.position.y = GRID_DIMENSIONS.height;
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
  let graph_width = GRID_DIMENSIONS.width * 2,
      graph_height = GRID_DIMENSIONS.height * 2,
      graph_y_offset = GRID_DIMENSIONS.height;

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

/**
 * Remove all 3D graphs, labels, grids, etc. from the scene
 */
function removeCurrentGraphsFromScene(){
  // clear all graphs
  for (var i = all_graphs.length - 1; i >= 0; i--) {
    scene.remove(all_graphs[i]);
  }
  all_graphs = [];

  // clear all labels
  for (var i = all_labels.length - 1; i >= 0; i--) {
    scene.remove(all_labels[i]);
  }
  all_labels = [];

  // clear grid
  scene.remove(grid_object);
  grid_object = undefined;
}

/**
 * Reset `scene` and draw graphs for a story
 * @param {Array} dataset - constant array of static data
 * @param {Array} dataset[x][0] - array of data values with [date,value]
 * @param {Array} dataset[x][1] - two value array with min/max values for createGraphPlane()
 * @param {Array} labels - constant array of label
 * @param {Array} labels[0] - X Axis
 * @param {Array} labels[1] - Y Axis
 */
function setupGraphsForStory(dataset, labels){
  // clear everything
  removeCurrentGraphsFromScene();

  // setup grid
  grid_object = setupAllGrids(labels[0].length, labels[1].length);

  // setup labels
  setupXAxisLabels(labels[0]);
  setupYAxisLabels(labels[1]);

  // setup graphs
  dataset.forEach(function(data, index){
      all_graphs.push(createGraphPlane(data[0], data[1], GRAPH_COLORS[index]));
  });
  addCurrentGraphsToScene();

  // hotspots
  placeHotspotOnGraph(all_graphs[0], 768);
  placeHotspotOnGraph(all_graphs[1], 728);
  placeHotspotOnGraph(all_graphs[3], 2000);
}

/**
 * Creates a text label sprite
 * Sprites always face the camera regardless of orientation
 * @param  {String} message - the text content of the label
 * @param  {Object} opts - limited config options for fontface, fontsize, etc.
 * @return {THREE.Sprite} - 3D Object ready to be added to a scene
 */
function createTextSprite(message, opts){
  let parameters = opts || {};
  let fontface = parameters.fontface || 'Arial';
  let fontsize = parameters.fontsize || 16;

  // multiplier. We'll multiple up the fontsize, then divide down the object.scale
  // Higher # == crisper text rendering. depreciating return for noticible difference ~3.
  let scale_multiplier = 3;

  // scale up font-size
  fontsize = fontsize * scale_multiplier;

  // create a canvas to render onto
  let canvas = document.createElement('canvas');
  let context = canvas.getContext('2d');

  // get size of text
  let metrics = context.measureText(message);
  // single digits w/ size < 200 weren't centering correctly
  let size = Math.max(200, Math.floor(metrics.width * fontsize / 8));

  // textures render best as squares
  canvas.width = size;
  canvas.height = size;


  /*// For Debugging, draw a border to show canvas.
  context.strokeStyle = "#f00";
  context.lineWidth = 2;
  context.strokeRect(0, 0, canvas.width, canvas.height);*/

  // style
  context.font = fontsize + "px " + fontface;
  context.fillStyle = 'rgba(0, 0, 0, 1.0)';
  // add text. vertically and horizontall center
  context.textAlign = "center";
  context.fillText(message, size / 2, size / 2 + fontsize / scale_multiplier);

  // canvas contents will be used for a texture
  let texture = new THREE.Texture(canvas)
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  // sprite object
  let spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  let sprite = new THREE.Sprite(spriteMaterial);

  // scale down the sprite
  sprite.scale.set(size / (scale_multiplier * 10), size / (scale_multiplier * 10), 1);

  return sprite;
}

/**
 * Evenly distribute labels along the x axis
 * Adding them to the global `scene`
 * @param  {Array} array of strings. One for each label.
 */
function setupXAxisLabels(labels){

  let starting_point = GRID_DIMENSIONS.width;
  let offset = GRID_DIMENSIONS.width * 2 / (labels.length - 1);

  labels.forEach((label_text, index) => {
    // create sprite label
    let sprite = createTextSprite(label_text);

    // position on along axis
    sprite.position.x = starting_point - (offset * index);

    // position on z axis
    sprite.position.z = -GRID_DIMENSIONS.depth - 2

    // y space
    sprite.position.y = -3;

    // add to scene
    scene.add(sprite);

    // add to global array
    all_labels.push(sprite);
  });
}

/**
 * Evenly distribute labels along the Y axis
 * Adding them to the global `scene`
 * @param  {Array} labels - array of strings. One for each label.
 */
function setupYAxisLabels(labels){

  let starting_point = 0;
  let offset = GRID_DIMENSIONS.height * 2 / (labels.length - 1);

  labels.forEach((label_text, index) => {
    // create sprite label
    let sprite = createTextSprite(label_text);

    // position on along axis
    sprite.position.y = starting_point + (offset * index);

    // position on z axis
    sprite.position.z = -GRID_DIMENSIONS.depth - 2

    // position outside graph on x
    sprite.position.x = -GRID_DIMENSIONS.width - 3;

    // add to scene
    scene.add(sprite);

    // add to global array
    all_labels.push(sprite);
  });
}

/**
 * Create a hotspot graphic
 * @return {THREE.Mesh} The 3D Object to be added to `scene`
 */
function createHotspot(){
  var geometry = new THREE.CircleGeometry( 0.5, 32 );
  var material = new THREE.MeshBasicMaterial( { color: 0xff0000, side: THREE.DoubleSide } );
  var circle = new THREE.Mesh( geometry, material );
  return circle;
}

/**
 * Creates and positions a hotspot along a graph
 * @param  {THREE.Mesh} graph_object - A THREE object for one of the graph planes
 * @param  {Number} offset_index - the index, offset from 0, to access graph.vertices[i]
 */
function placeHotspotOnGraph(graph_object = all_graphs[3], offset_index = 200){

  // derive the length of the data from length of graph
  // 1/2 bc graph is a polygon with equal top/bottom vertices.
  let data_length = graph_object.geometry.vertices.length / 2;
  // find vertex along graph
  // verticies[0] is last point, verticies[(dataset.length - 1)] is first point
  let data_point = Math.round( (data_length - 1) - offset_index );
  // get Vector3 position
  let vertex_position = graph_object.geometry.vertices[data_point];

  // set pos of hotspot
  let hotspot = createHotspot();
  hotspot.position.x = vertex_position.x;
  hotspot.position.y = vertex_position.y + graph_object.position.y;
  hotspot.position.z = graph_object.position.z;

  scene.add(hotspot);
}

// animation loop
function animate(){
  requestAnimationFrame( animate );
  controls.update();
  stats.update();
  TWEEN.update();
  render();
}

// render loop to re-draw frame 60 times per second
function render() {
  renderer.render( scene, camera );
}

initialize();
animate();
