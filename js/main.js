/* THREE setup */
var container, scene, renderer,
/* camera related + helpers */
    camera, controls, stats,
/* all currently active: objects in scene + data */
    grid_object, all_graphs = [], all_labels = [], all_hotspots = [], all_data_values = [],
/* hover objects */
    all_hover_planes = [], group_hover_points, group_hover_labels, hover_connect_line,
/* mouse tracking */
    mouse, raycaster;

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
 * All data to graph a story
 * @type {Array} An array of data sets
 * @type {Array} data[x][0] - array of data values with [date,value]
 * @type {Array} data[x][1] - two value array with min/max values for Y axis in createGraphPlane()
 */
const DATA_BREXIT = [ [data_brexit_gbp, [0,15]], [data_brexit_vix, [0,150]], [data_brexit_uk, [0,15]], [data_brexit_msci, [0,150]] ];
const DATA_HOUSING = [ [data_housing_usfed, [-1,60]], [data_housing_abx, [0,600]], [data_housing_spcs, [0,600]],[data_housing_sp500, [0,600]] ];
const DATA_MONETARY = [ [data_monetary_10yr, [0,50]], [data_monetary_usfedfunds, [-1,50]],  [data_monetary_unemploy, [0,50]], [data_monetary_fedreserve, [0,5000000]] ];
const DATA_CHINA = [ [data_china_gdp, [0, 60]], [data_china_sp500, [0, 6000]], [data_china_cny, [0, 0.6]], [data_china_shanghai, [0, 6000]] ];
const DATA_OIL = [ [data_oil_opec, [0, 150000]], [data_oil_non_opec, [0, 150000]], [data_oil_msci, [0,1500]], [data_oil_crude, [0, 150]] ];

/**
 * X/Y Axis labels per story
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
 * Constants used for sizing/positiong the camera
 * @type {Number}
 */
const VIEW_SIZE = Math.max(GRID_DIMENSIONS.width * 1.5, GRID_DIMENSIONS.height * 1.5);
const ASPECT = window.innerWidth / window.innerHeight;

/**
 * Default camera positions
 * @type {THREE.Vector3} { x, y, z }
 */
const POSITION_2D = new THREE.Vector3(0, 0, -VIEW_SIZE);
const POSITION_3D = new THREE.Vector3(0.8, 0.55, -VIEW_SIZE);

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
  camera = new THREE.OrthographicCamera( -ASPECT*VIEW_SIZE / 2, ASPECT*VIEW_SIZE / 2, VIEW_SIZE / 2, -VIEW_SIZE / 2, 0, 500 );

  //zoom
  camera.zoom = 0.85;
  camera.updateProjectionMatrix();
  // position
  camera.position.x = POSITION_2D.x;
  camera.position.y = POSITION_2D.y;
  camera.position.z = POSITION_2D.z;

  // Controls
  controls = new THREE.OrbitControls( camera, renderer.domElement );

  // Stats
  stats = new Stats();
  container.appendChild(stats.dom);

  // Mouse
  mouse = new THREE.Vector2();

  // Raycaster
  raycaster = new THREE.Raycaster();

  // Graphs, Data, Labels
  setupGraphsForStory(DATA_BREXIT, LABELS_BREXIT);

  // Objects for hover functionality
  setupHoverFuncObjects();

  // Event Handlers
  bindEventHandlers();

}

/**
 * Add JS event handlers
 */
function bindEventHandlers(){
  window.addEventListener( 'mousemove', onMouseMove, false );
  window.addEventListener( 'mouseup', checkRaycastHotspots, false);
}

/**
 * On mouse movement events, update the mouse vector coordinates
 * Normalizes screen coords to 3d coords.
 * @param  {Event} event - event object from 'mousemove'
 */
function onMouseMove( event ) {
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
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

  grid_object.add( grid_xy, grid_xz, grid_yz );
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
 * Given an array of THREE objects, remove them from scene and reset array
 * @param  {Array} scene_objects - the array to reset
 * @return {Array} empty array to nullify
 */
function removeArrayObjectsFromScene(scene_objects = []){
  for (var i = scene_objects.length - 1; i >= 0; i--) {
    scene.remove(scene_objects[i]);
  }
  return [];
}

/**
 * Remove all 3D graphs, labels, grids, etc. from the scene
 */
function resetCurrentScene(){
  // clear all graphs
  all_graphs = removeArrayObjectsFromScene(all_graphs);

  // clear all labels
  all_labels = removeArrayObjectsFromScene(all_labels);

  // clear hotspots
  all_hotspots = removeArrayObjectsFromScene(all_hotspots);

  // clear grid
  scene.remove(grid_object);
  grid_object = undefined;

  // clear data
  all_data_values = [];
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
  resetCurrentScene();

  // setup grid
  grid_object = setupAllGrids(labels[0].length, labels[1].length);

  // setup labels
  setupXAxisLabels(labels[0]);
  setupYAxisLabels(labels[1]);

  // setup graphs
  dataset.forEach(function(data, index){
      // create 3D plane
      all_graphs.push(createGraphPlane(data[0], data[1], GRAPH_COLORS[index]));
      // save values for later
      all_data_values.push(data[0]);
  });
  addCurrentGraphsToScene();

  // hotspots
  all_hotspots.push(placeHotspotOnGraph(all_graphs[0], 0));
  all_hotspots.push(placeHotspotOnGraph(all_graphs[1], dataset[1][0].length / 2));
  all_hotspots.push(placeHotspotOnGraph(all_graphs[3], dataset[3][0].length - 1));
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
 * @param {Hex} color - the base color to shade material
 * @param {Number} radius - size of hotspot in 3D world coords
 * @return {THREE.Mesh} The 3D Object to be added to `scene`
 */
function createHotspot(color = 0x1374B8, radius = 0.45){
  var geometry = new THREE.SphereGeometry( radius, 32, 32 );
  var material = new THREE.MeshBasicMaterial( { color: color, side: THREE.DoubleSide } );
  var circle = new THREE.Mesh( geometry, material );
  return circle;
}

/**
 * Creates and positions a hotspot along a graph
 * @param  {THREE.Mesh} graph_object - A THREE object for one of the graph planes
 * @param  {Number} offset_index - the index, offset from 0, to access graph.vertices[i]
 * @return The hotspot THREE.mesh after positioning and adding to scene
 */
function placeHotspotOnGraph(graph_object = all_graphs[3], offset_index = 200){

  // derive the length of the data from length of graph
  // 1/2 bc graph is a polygon with equal top/bottom vertices.
  let data_length = Math.floor( graph_object.geometry.vertices.length / 2);
  // find vertex along graph
  // verticies[0] is last point, verticies[(dataset.length - 1)] is first point
  let data_point = (data_length - 1) - Math.floor(offset_index);
  // get Vector3 position
  let vertex_position = graph_object.geometry.vertices[data_point];

  // set pos of hotspot
  let hotspot = createHotspot();
  hotspot.position.x = vertex_position.x;
  hotspot.position.y = vertex_position.y + graph_object.position.y + 0.5;
  hotspot.position.z = graph_object.position.z;

  scene.add(hotspot);

  return hotspot;
}

/**
 * Checks if mouse intersects w/ any 3D objects in all_hotspots
 */
function checkRaycastHotspots(){
  // calculate objects intersecting the picking ray
  var intersects = raycaster.intersectObjects( all_hotspots );

  if(intersects.length > 0){
    console.log(intersects[0]);
    alert("Hotspot clicked.");
    // intersects[0].object.material.color.set( 0x0000ff );
  }
}

/**
 * Setup all of the components required for the hover effect
 * 'Hover effect' = hovering over the graph areas, draws aligned points on each plane and connecting line
 * All objects will later be updated in checkRaycastHoverPlanes();
 */
function setupHoverFuncObjects(){

  /*
  * Setup planes for raycasting
  */
  var geometry_bottom = new THREE.PlaneGeometry( GRID_DIMENSIONS.width * 2, GRID_DIMENSIONS.depth * 2, 1, 1 );
  var geometry_back = new THREE.PlaneGeometry( GRID_DIMENSIONS.width * 2, GRID_DIMENSIONS.height * 2, 1, 1 );

  // material
  var material = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, transparent: true, opacity: 0 });

  // bundle geo + material
  var plane_bottom = new THREE.Mesh( geometry_bottom, material );
  plane_bottom.rotateX(Math.PI / 2);

  var plane_back = new THREE.Mesh( geometry_back, material );
  plane_back.position.z = GRID_DIMENSIONS.depth;
  plane_back.position.y = GRID_DIMENSIONS.height;

  scene.add( plane_bottom, plane_back );

  all_hover_planes.push( plane_bottom, plane_back );

  /*
  * Setup points
  */
  group_hover_points = new THREE.Object3D();
  group_hover_points.visible = false;

  /*
  * Setup line to connect points
  */
  var line_material = new THREE.LineBasicMaterial({ color: 0x555555 });
  var line_geometry = new THREE.Geometry();
  hover_connect_line = new THREE.Line(line_geometry, line_material);
  hover_connect_line.visible = false;

  /*
  * Add placeholder hotspots + line vertices
  */
  for (var i = 0; i <= 3; i++) {
    // hotspot
    var point = createHotspot(0x111111, 0.25);
    group_hover_points.add(point);

    // vertex
    line_geometry.vertices.push(new THREE.Vector3(0,0,0))
  }

  // add everything to scene
  // should be visible = false;
  scene.add( group_hover_points, hover_connect_line);
}

/**
 * Detects if mouse is intersecting with the grid/graphs
 * Then calculates position along X axis for each graph plane
 * Creates a 3D point on each vertex and updates a line to connect them
 */
function checkRaycastHoverPlanes(){
  var intersects = raycaster.intersectObjects( all_hover_planes.concat(all_graphs) );

  if(intersects.length > 0){
    // console.log(camera.rotation);

    var intersect_x_axis = intersects[0].point.x;

    // map over all graphs
    // calc vertex position based on raycast intersects
    // and save value at that point
    var graph_vertices = all_graphs.map(function(graph_object, index){

      // corresponding dataset per graph
      var dataset = all_data_values[index];
      var data_length = Math.floor( dataset.length );

      // Convert the intersection point in 3D world coords to a vertex index along the graph
      var normalized_vertex_index = mapRange(
                                             /* from grid dimensions in 3d coords */
                                             [GRID_DIMENSIONS.width, -GRID_DIMENSIONS.width],
                                             /* to an index in the data */
                                             [(data_length - 1), 0],
                                             /* given world coord of raycast intersection */
                                             intersect_x_axis
                                           );

      // remove any fractions
      normalized_vertex_index = Math.round(normalized_vertex_index);

      // return vertex at given index
      // vertex is a THREE.Vector3, BUT w/ the value appended from createGraphPlane()
      return all_graphs[index].geometry.vertices[normalized_vertex_index];

    });

    // clear previous labels
    scene.remove(group_hover_labels);
    group_hover_labels = new THREE.Object3D();

    // update position of points along graphs
    graph_vertices.forEach(function(graph_point, index){

      // circle indicator on graph
      var point = group_hover_points.children[index];
      point.position.x = graph_vertices[index].x;
      point.position.y = graph_vertices[index].y + all_graphs[index].position.y;
      point.position.z = all_graphs[index].position.z;

      // sprite label
      var label = createTextSprite(graph_vertices[index].value);
      label.position.copy(point.position);
      label.position.x -= 2;
      label.position.y += 1;
      group_hover_labels.add(label);

      // line
      hover_connect_line.geometry.vertices[index].copy(point.position);
      hover_connect_line.geometry.verticesNeedUpdate = true;

    });

    // add points to scene via visibility
    group_hover_points.visible = true;
    hover_connect_line.visible = true;

    // add all labels
    scene.add(group_hover_labels);


  } else {
    // if no intersection, hide the points
    if(group_hover_points.visible){
      group_hover_points.visible = false;
      hover_connect_line.visible = false;
      scene.remove(group_hover_labels);
    }
  }
}

/**
 * Updates raycast origin/direction based on mouse/camera coords
 * Generic fn for the animate() loop
 * @return {[type]} [description]
 */
function raycastUpdate(){

  // early exit on first init
  if(mouse.x === 0 && mouse.y === 0){
    return false;
  }

  // update the picking ray with the camera and mouse position
  raycaster.setFromCamera( mouse, camera );

}

// animation loop
function animate(){
  requestAnimationFrame( animate );
  controls.update();
  stats.update();
  TWEEN.update();
  raycastUpdate();

  // TODO if mobile, then don't run every frame
  checkRaycastHoverPlanes();

  render();
}

// render loop to re-draw frame 60 times per second
function render() {
  renderer.render( scene, camera );
}

initialize();
animate();
