// (function() {
	// Function global to uncomment when push into someone else code, keep my vars mine
	'use strict';
	/*
	 * SET VARS
	 */
	var canvas_width = d3.select('#chart-canvas').node().offsetWidth;

	var xScale = d3.time.scale()
		.rangeRound([165, canvas_width]);


	var data = [];
	var errors = [];

	var number_of_bars, canvas_height;

	// Compute the height our canvas needs to be once we get the data
	var bar_height = 20;
	var bar_margin_bottom = 10;
	var container_top_padding = 30;
	var container_bottom_padding = 40;

	// Declare color/filter vars
	var color_selector, filter_selector;

	var today = new Date();

	var ganttBarContainer;

	/*
	 * LOAD AND TIDY DATA
	 */
	
	var dateFormat = d3.time.format("%Y-%m-%dT%H:%M:%SZ");
	var milestonesDateFormat = d3.time.format("%B %d, %Y");
	var titleFormat = d3.time.format("%B %d");
	var dueFormat = d3.time.format(" %B %d");

	
	function visualize() {
		tidyData(issues);
		initialRender();
		render();
	}

	function tidyData(issues) {
		issues.forEach(function(d,i) {
			var object = [];
			object.id = i;
			object.title = d.title;
			object.assignee = [];
			if (d.assignees.length > 0) {
				d.assignees.forEach(function(d,i) {
					object.assignee.push(d.login);
				});
			} else {
				object.assignee.push("unassigned");
			}
			if (d.milestone) {
				object.milestone = d.milestone.title;	
			}
			if (d.labels) {
				object.label = [];
				d.labels.forEach(function(d,i) {
					if (d.name == "P1") {
						object.priority = "P1";
					} else if (d.name == "P2") {
						object.priority = "P2";
					} else {
						object.label.push(d.name);
					}
				})
			}
			object.url = 'https://github.com/MozillaFoundation/Advocacy/issues/'+d.number;
			
			var bda = d.body.split('*').forEach(function(d,i) {
				var bdaS = d.split(':');
				bdaS.forEach(function(d,i) {
					if (d == "Start date") {
						var start_temp = bdaS[i+1].trim();
						object.valid = true;
						try {
							object.created_at = milestonesDateFormat.parse(start_temp);
						} catch(err) {
							errors.push(object.url);
						}
					}
					if (d == "Due date") {
						var end_temp = bdaS[i+1].trim();
						object.valid = true;
						try {
							object.due_on = milestonesDateFormat.parse(end_temp);
						} catch(err) {
							errors.push(object.url);
						}
					}
				});			
				
			});

			if (object.created_at == null) {
				try { 
					object.created_at = dateFormat.parse(d.created_at);				
				} catch(err) {
					errors.push(object.url);
				}
			}

			if (object.due_on == null  && d.milestone && d.milestone.due_on !== null) {
				try {
					object.due_on = dateFormat.parse(d.milestone.due_on);
				} catch(err) {
					errors.push(object.url);
				}
			}
			if (object.due_on && object.created_at) {
				data.push(object);	
			} else {
				errors.push(object);
			}
				
		})

		if (errors.length > 0) {
			errors.forEach(function(d,i) {
				if (d.valid) {
					console.log("Check <a href="+d.url+">"+d.url+"</a> for errors.");
				}
			});
		}

		milestones.forEach(function(d,i) {
			d3.select("#milestone").append('option').text(d.title);
		})

		$.getJSON("https://api.github.com/repos/MozillaFoundation/Advocacy/labels", function(data) {
			data.forEach(function(d,i) {
				d3.select("#label").append('option').text(d.name);
			})
		});

		data.sort(function(a,b) {
			return a.due_on - b.due_on;
		})


		// Find min/max of our dates
		var min = d3.min(data, function(d) { return d.created_at});
		var max = d3.max(data, function(d) { return d.due_on });

		xScale.domain([min, max]);

		number_of_bars = data.length;
		canvas_height = number_of_bars * (bar_height + bar_margin_bottom) + container_top_padding + container_bottom_padding;
	}


	/*
	 * DRAW WITH DATA
	 */

	function initialRender() {
		// Create svg container
		var svg = d3.select('#svg-canvas')
			.append('svg')
				.attr('width', canvas_width+50)
				.attr('height', canvas_height);

		// Create base axis; assign scale made up above
		var xAxis = d3.svg.axis()
			.scale(xScale)
			.orient('bottom');

		// Bottom Axis
		var btmAxis = svg.append('g')
			.attr('transform', 'translate(0,' + (canvas_height - 30) + ')')
			.attr('class', 'axis')
			.call(xAxis);

		// Top Axis
		var topAxis = svg.append('g')
			.attr('transform', 'translate(0,10)')
			.attr('class', 'axis')
			.call(xAxis);

		// Lines
		var monthlyLines = svg.append('g')
			.selectAll('line')
			.data(xScale.ticks(20))
			.enter()
			.append('line')
				.attr('x1', xScale)
				.attr('x2', xScale)
				.attr('y1', 30)
				.attr('y2', canvas_height-25)
				.style('stroke', '#ccc');




		var todayline = svg.append('line')
			.datum(today)
			.attr('x1', xScale)
			.attr('x2', xScale)
			.attr('y1', 0)
			.attr('y2', canvas_height - 25)
			.style('stroke', '#c00');

		d3.select('#chart-canvas').style('height', canvas_height + 'px');


		ganttBarContainer = d3.select('#gantt-bar-container')
			.on('mousemove', function(d, i) {
				// Place mouse move on bar-container so the tooltip renders over the bars but sets to the xy of the bar it tips
				var xy = d3.mouse(this);
				// Update Tooltip Position & value
				tooltip
					.style('left', xy[0] + 'px')
					.style('top', xy[1] + 'px');
			});

		ganttBarContainer.append('div')
			.datum(today)
			.text('Today')
			.attr('class', 'todaymarker')
			.style('position', 'absolute')
			// height of "today" slightly higher so as not to interfere with milestones
			.style('top', '-50px')
			.style('left', function(d) { return (xScale(d) -1) + 'px' });

	}

	var tooltip = d3.select('#tooltip');

	function render() {

		var filteredData = data;

		if (filter_selector) {
			if (filter_selector[1] == "All") {
				filteredData = data.filter(function(d) { return d});
			} else if (filter_selector[0] == "label" ) {
				filteredData = data.filter(function(d) {
					if (d.label) { 
						var arr = d.label.indexOf(filter_selector[1]);
						if (arr > -1) {
							return d;
						}
					}
				});
			} else if (filter_selector[0] == "assignee" ) {
				filteredData = data.filter(function(d) {
					if (d.assignee) { 
						var arr = d.assignee.indexOf(filter_selector[1]);
						if (arr > -1) {
							return d;
						}
					}
				});
			} else {
				filteredData = data.filter(function(d) { return d[filter_selector[0]] == filter_selector[1]});	
			}
		}

 		var barWrappers = ganttBarContainer.selectAll('.bar-wrapper')
			.data(filteredData, function(d,i) { return d.id});

 		var bwe = barWrappers
			.enter()
			.append('div')
			.attr('class', function(d) { return 'bar-wrapper '+ d.assignee})
			.on('mouseover', function(d, i) {
				tooltip.append('p')
					.attr('class','heading')
					.text(d.title);
				tooltip.append('p')
					.attr('class','indent')
					.text(d.assignee);
				tooltip.append('p')
					.attr('class','indent')
					.text('Start date: '+ titleFormat(d.created_at));
				tooltip.append('p')
					.attr('class','indent')
					.text('Due date: '+ titleFormat(d.due_on));

				tooltip.style('display', 'block');
			})
			.on('mouseout', function(d, i) {
				$("#tooltip").empty();
				tooltip.style('display', 'none');
			})
			.on('click', function(d, i) {
				window.open(d.url, '_blank');
			});

		var bars = bwe
			.append('div')
				.attr('class', 'bar')
				.style('margin-left', function(d, i) { return xScale(d.created_at) + 'px' })
				.style('width', function(d, i) { return xScale(d.due_on) - xScale(d.created_at) + 'px' })

		bars
			.append('div')
				.attr('class', 'bar-name')
				.text(function(d) { 
					if (d.title.length > 50) {
						return d.title.substring(0,50)+'...';
					} else {
						return d.title;
					}});


		barWrappers.selectAll('.bar')
			.style('background', function(d) {
				if (color_selector == 'priority') {
					return priorityScale(d.priority);
				}
				if (color_selector == 'team') {
					return teamColorScale(d.team);
				}
			});
		// Set transitions to replace isotope
		barWrappers
			.transition()
			.duration(600)
			.delay(function(d, i) { return i * 15 })
			.style('display', 'block')
			.style('opacity', 1)
			.style('top', function(d, i) {
				return i * (bar_height + bar_margin_bottom) + 'px';
			});

		barWrappers
			.exit()
			.transition()
			.style('opacity', 1e-6)
			.transition()
			.style('display', 'none');
	}


	// SORTING BUTTONS
	// So let's make a simple sort_ascending boolean variable and set it to true
	var sort_ascending = true;

	d3.selectAll('#sorter li')
		.on('click', function() {
		$(this).addClass('active');
		$('#sorter li').not(this).removeClass('active');
		// Set it to what it isn't, if it was true, make it false and vice versa
		// When you click a button twice, it will flop its sort order; a simple toggle
		sort_ascending = !sort_ascending;
		var sorter_selector = d3.select(this).attr('data-sorter');

		data.sort(function(a, b) {
			if (sort_ascending) {
				return d3.ascending(a[sorter_selector], b[sorter_selector]);
			} else {
				return d3.descending(a[sorter_selector], b[sorter_selector]);
			}
		});
		render(data);
	});

	// FILTER BUTTONS
	
	d3.selectAll('.filter li').on('click', function() {
		filter_selector = [];
		filter_selector.push('priority');
		filter_selector.push($(this).attr('data-filter'));
		$(this).addClass('active');
		$('.filter li').not(this).removeClass('active');
		$('.filter').not(this).removeClass('active');
		render();

	});
	d3.selectAll('.filter').on('change', function() {
		filter_selector = [];
		filter_selector.push($(this).attr('id'));
		filter_selector.push($(this).find('option:selected').text());
		$(this).addClass('active');
		$('.filter').not(this).removeClass('active');
		$('.filter li').not(this).removeClass('active');
		render();

	});

	// COLOR BUTTONS
	d3.selectAll('#color li').on('click', function() {
		color_selector = d3.select(this).attr('data-filter');
		render(data);
	});

// })();
