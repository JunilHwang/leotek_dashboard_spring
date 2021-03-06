var bus = new Vue({
	data:{
		isHome:true,
		member:dataProcessor.getMember(),
		device:localStorage.getItem('device') ? JSON.parse(localStorage.getItem('device')) : [],
		indoor:localStorage.getItem('device_indoor') ? JSON.parse(localStorage.getItem('device_indoor')) : [],
		outdoor:localStorage.getItem('device_outdoor') ? JSON.parse(localStorage.getItem('device_outdoor')) : [],
		selectedOutdoor:(function(){
			var obj = localStorage.getItem('outdoor');
			return obj ? JSON.parse(obj) : null;
		}()),
		selectedIndoor:(function(){
			var obj = localStorage.getItem('indoor');
			return obj ? JSON.parse(obj) : null;
		}()),
		activeData:null,
        graphData:localStorage.getItem("graph_data") ? JSON.parse(localStorage.getItem("graph_data")) : [],
        graphPoint:localStorage.getItem("graph_point") ? JSON.parse(localStorage.getItem("graph_point")) : {},
		graphDataPart:[],
		graphType:'CIAQI',
		graphLoading:false,
		graphNone:true,
		unit:{
			'CIAQI':"",
			'TEMP':" ℃",
			'HUM':" %",
			'DUST_IDX':" μg",
			'CO2_IDX':" ppm",
			'TVOC_IDX':" ppb",
		},
		map:null,
		mini_map:null,
		infowindow:{},
		prevwindow:false,
		homeData:false,
	},
	computed:{},
	methods:{
		setPage:function(e){
			e.preventDefault();
		},
		getGraph:function(){
			var _this = this;
			var start_date = getNow(), end_date = getNow();
			if($(".datepicker.start").length){
				start_date = $(".datepicker.start").val();
				end_date = $(".datepicker.end").val();
			}
			_this.graphLoading = false;
			_this.graphNone = false;
			$.ajax({
				type:'get',
				url:'./getGraph',
				data:{srno:_this.activeData.DVC_SRNO,start:start_date,end:end_date},
				success:function(data){
					var jsonData = data;
					if(jsonData.data.length){
						_this.graphData = jsonData.data;
						_this.graphPoint = jsonData.point;
						_this.graphDataPart = jsonData.data.reverse().slice(0,100);
						jsonData.data.reverse();
						graphCreate();
						_this.graphNone=false;
						localStorage.setItem("graph_data",JSON.stringify(jsonData.data));
						localStorage.setItem("graph_point",JSON.stringify(jsonData.point));
					} else {
						_this.graphData = [];
						_this.graphPoint = {};
						_this.graphDataPart = [];
						_this.graphNone=true;
					}
					_this.graphLoading = true;
				}
			})
		}
	}
});

//app
function app(){
	return new Vue({
		el:"#app",
		data:{
			member:false
		},
		template:getTemplate('app'),
		components:{
			'login':{
				template:getTemplate('login'),
				created:function(){
					$("#page-title").html('Leotek Dashboard Login');
					setTimeout(function(){ $("[autofocus]").focus()});
				}
			},
			'site':{
				template:getTemplate('site'),
				created:function(){
					$("#page-title").html('Leotek Dashboard');					
				},
				components:site()
			}
		}
	})
}

function site(){
	return {
		'site-header':{
			template:getTemplate('site-header'),
			methods:{
				logout:function(e){
					e.preventDefault();
					$.get("./logout",null,function(data){
						alert('로그아웃 되었습니다.');
						bus.member = false;
					});
				}
			}
		},
		'home':{
			template:getTemplate('home'),
			data:function(){
				return {
					nowIndoor:localStorage.getItem('nowIndoor') ? JSON.parse(localStorage.getItem('nowIndoor')) : null,
					nowOutdoor:localStorage.getItem('nowOutdoor') ? JSON.parse(localStorage.getItem('nowOutdoor')) : null,
					weather:{
                        date:null,
                        place:'Seoul',
                        temp:'15 ℃',
                        number:'1-3',
					},
					today_list:localStorage.getItem('today_list') ? JSON.parse(localStorage.getItem('today_list')) : null,
					week_list:localStorage.getItem('week_list') ? JSON.parse(localStorage.getItem('week_list')) : null,
					time:null
				}
			},
			created:function(){
				this.getNowTime();
                this.getList();
                setInterval(this.getNowTime, 1000);
                setInterval(this.getList, 1000*30);
                bus.homeData = this;
			},
			methods:{
				getNowTime:function(){
                    var date = new Date();
                    var h = date.getHours();
                    var i = date.getMinutes();
                    var s = date.getSeconds();
                    if(h < 10) h = "0"+h;
                    if(i < 10) i = "0"+i;
                    if(s < 10) s = "0"+s;
                    this.time = h+':'+i+':'+s;
                    this.weather.date = date.toUTCString();
				},
				getList:function(){
					var _this = this;
                    $.ajax({
                        type:'get',
                        url:'/getRangeList',
                        data:{user_id:bus.member.USR_ID},
                        success:function(data){
                            _this.today_list = data.today;
                            _this.week_list = data.week;
                            for(var i=0, len=data.today.length; i<len; i++){
                                if(data.today[i].DVC_CD != '03'){
                                    _this.nowIndoor = data.today[i];
                                    localStorage.setItem("nowIndoor",JSON.stringify(data.today[i]));
                                    break;
                                }
                            }
                            for(var i=0, len=data.today.length; i<len; i++){
                                if(data.today[i].DVC_CD == '03'){
                                    _this.nowOutdoor = data.today[i];
                                    localStorage.setItem("nowOutdoor",JSON.stringify(data.today[i]));
                                    break;
                                }
                            }
                            if(data.today.length) localStorage.setItem("today_list",JSON.stringify(data.today));
                            if(data.week.length) localStorage.setItem("week_list",JSON.stringify(data.week));
                        }
                    })
				},
                changeDoor:function(obj){
					if(obj.DVC_CD == '03'){
						this.nowOutdoor = obj;
					} else {
                        this.nowIndoor = obj;
					}
					miniMap();
				}
			},
			mounted:function(){
                google.maps.event.addDomListener(window, 'load', miniMap);
                miniMap();
                setInterval(miniMap,30000);
			}
		},
		'content-01':{
			template:getTemplate('content-01'),
			data:function(){
				return {
					loading:true
				}
			},
			methods:{
				selectIndoor:function(obj){
					obj = this.getDetail(obj);
					bus.selectedIndoor = obj;
					localStorage.setItem("indoor",JSON.stringify(obj));
					bus.activeData = obj;
					bus.getGraph();
				},
				selectOutdoor:function(obj){
					obj = this.getDetail(obj);
					bus.selectedOutdoor = obj;
					localStorage.setItem("outdoor",JSON.stringify(obj));
					bus.activeData = obj;
					bus.getGraph();
				},
				getDetail:function(obj){
					var option = {
						data:{
							table:'GetDayMeterData',
							serialNo:obj.DVC_SRNO,
							id:bus.member.USR_ID
						},
						async:false,
						success:function(data){
							obj['list'] = data.Data;
						}
					}
					db.get(option);
					return obj;
				}
			},
			created:function(){
				var _this = this;
				if(bus.device.length) _this.loading = false;
				var option = {
					data:{
						table:"GetDevice",
						userid:bus.member.USR_ID
					},
					success:function(data){
						var device = data;
						var indoor = [], outdoor = [];
						var obj;
						if(device) for(var i=0, len = device.length; i<len; i++){
							obj = device[i];
							if(obj.DVC_CD == '03'){
								outdoor.push(obj);
							} else {
								indoor.push(obj);
							}
							//console.log(obj.DVC_SRNO);
						}
						bus.device = device;
						bus.indoor = indoor;
						bus.outdoor = outdoor;
                        localStorage.setItem("device",JSON.stringify(data));
                        localStorage.setItem("device_indoor",JSON.stringify(indoor));
                        localStorage.setItem("device_outdoor",JSON.stringify(outdoor));
						_this.loading = false;
					}
				}
                db.getDevice(option);
                setInterval(function(){
                    db.getDevice(option)
                },1000*30);
			}
		},
		'content-02':{
			template:getTemplate('content-02'),
			data:function(){
				return {
					start:getNow(),
					end:getNow(),
					graphType:[
						{id:'1',type:'CIAQI'},
						{id:'2',type:'TEMP'},
						{id:'3',type:'HUM'},
						{id:'4',type:'DUST_IDX'},
						{id:'5',type:'CO2_IDX'},
						{id:'6',type:'TVOC_IDX'},
					],
				}
			},
			computed:{
				activeIn:function(){
					return bus.activeData === bus.selectedIndoor ? ' active' : '';
				},
				activeOut:function(){
					return bus.activeData === bus.selectedOutdoor ? ' active' : '';
				}
			},
			methods:{
				active:function(type){
					if(type == 'in'){
						bus.activeData = bus.selectedIndoor;
					} else if(type == 'out'){
						bus.activeData = bus.selectedOutdoor;
					}
					bus.getGraph();
				},
			},
			created:function(){
				bus.activeData = bus.selectedIndoor;
                if(bus.activeData) bus.getGraph();
			},
			mounted:function(){
				$(".datepicker.start").datepicker();
				$(".datepicker.end").datepicker({"minDate":new Date()})
				$(".datepicker").val(getNow());
				if(!bus.isHome) bus.getGraph();
				setInterval(function () {
					if(!bus.isHome) bus.getGraph();
				}, 1000 * 30)
			}
		},
		'content-03':{
			template:getTemplate('content-03'),
			methods:{
				dataVal:function(data){
					return parseInt(parseFloat(data)*100)/100;
				},
				dateFormat:function(data){

					data = data.replace(/\-/gi,"/").slice(0,16);
					return data;
				}
			}
		},
		'content-04':{
			template:getTemplate('content-04'),
			data:function(){
				return {
					sortable:false
				}
			},
			data:function(){
				return {
					search_key:''
				}
			},
			computed:{
				deviceList:function(){
					var search_list = [];
					if(this.search_key.length == 0){
						search_list = bus.device;
					} else {
						var obj;
						for(var i=0, len = bus.device.length; i<len; i++){
							obj = bus.device[i];
							if(obj['DVC_NM'].indexOf(this.search_key) != -1){
								search_list.push(obj);
							}
						}
					}
					return search_list;
				}
			},
			mounted:function(){
				google.maps.event.addDomListener(window, 'load', initMap);
                initMap();
                setInterval(initMap,30000);
			},
			methods:{
				sortDevice:function(){
					if(!this.sortable){
						bus.device.sort(function(a, b) {
							var nameA = a.DVC_NM.toUpperCase(); // ignore upper and lowercase
							var nameB = b.DVC_NM.toUpperCase(); // ignore upper and lowercase
							if (nameA < nameB) {
								return -1;
							}
							if (nameA > nameB) {
								return 1;
							}
							return 0;
						});
						this.sortable = true
					}  else {
						bus.device.reverse();
					}
				},
				selectDevice:function(obj){
					bus.map.setCenter({lat:obj.DVC_GIS_Y, lng:obj.DVC_GIS_X});
					if(bus.infowindow[obj.DVC_NM]){
						var infowindow = bus.infowindow[obj.DVC_NM][0];
						var marker = bus.infowindow[obj.DVC_NM][1];
						if(bus.prevwindow != false) bus.prevwindow.close();
						bus.prevwindow = infowindow;
						infowindow.open(bus.map, marker);
					}
				}
			}
		},
		'content-05':{
            template:getTemplate('content-05'),
			data:function(){
            	return {
            		today:(function(){
            			var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            			var date = new Date();
            			var y = date.getFullYear(),
							m = months[date.getMonth()],
							d = date.getDate() + "st";
            			var fullDate = m+' '+d+' '+y;
            			return fullDate;
					}()),
					place:'Seoul',
					temp:'21 ℃',
					max_temp:'24 ℃',
					min_temp:'12 ℃',
					rain:'70 %',
                    humidity:'70 %',
                    dust:'Very Bad',
                    weather_number:"1-"+(Math.floor(Math.random()*5)+1),
					week_info:(function(){
                        var weeks = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
							standardDate = new Date(),
							week_list = [],
							date, weekName, min_temp, max_temp, weather_number;
						for(var i=0; i<7; i++){
							date = new Date(standardDate.getTime() + (1000*60*60*24*i));
                            weekName = weeks[date.getDay()];
							weather_number = "1-"+(Math.floor(Math.random()*5)+1);
							min_temp = parseInt(Math.random()*5);
							max_temp = 5+parseInt(Math.random()*10);
                            var obj = {
                                weekName:weekName,
                                weather_number:weather_number,
                                min_temp:min_temp+" ℃",
                                max_temp:max_temp+" ℃",
							};
                            week_list.push(obj);
						}
						return week_list;
					}())
				}
			}
		}
	}
}

//Application Execute
app();

function getTemplate(file,option){
	if(!option) option = null;
	$.ajax({
		type:'GET',
		url:'./public/component/'+file+'.html',
		data:option,
		async: false,
		success:function(data){
			text = data;
		}
	})
	return text;
}

function getDate( element ) {
	var date = null
	date = $.datepicker.parseDate( "yy-mm-dd", element.value );
	return date;
}

function getNow(){
	var date = new Date();
	var year = date.getFullYear();
	var month = date.getMonth()+1;
	var day = date.getDate();
	if(month < 10) month = "0"+month;
	if(day < 10) day = "0"+day;
	var now = year+"-"+month+"-"+day;
	return now;
}

function graphCreate(){
	var data = bus.graphData;
	var point = bus.graphPoint;
	var type = bus.graphType;
	var min = parseFloat(point['MIN_'+type]) ? parseFloat(point['MIN_'+type]) : 0;
	var max = parseFloat(point['MAX_'+type]) - min;
	var canvas = document.getElementById('graph'),
		context = canvas.getContext('2d'),
		ratio = 1,
		move_left_by = 1,
		step = 1;
	canvas.width = $("#graph").width();
	canvas.height = $("#graph").height();
	var width = canvas.width;
	var height = canvas.height;
	var renderData = [],
		renderTime = [];
	context.fillStyle = '#f5f5f5';
	if(max != 0) if(height < max){
		ratio = max/height;
		height = max;
	} else {
		ratio = height/max;
	}
	if(data.length > 0) if(width >= data.length){
		move_left_by = width/data.length;
		width = data.length;
		for(var i=0,len=data.length;i<len;i++){
			renderData[i] = data[i][type] - min;
			renderTime[i] = data[i]['UPD_DT'];
		}
	} else {
		step = parseInt(data.length/width)+1;
		var avg, cnt;
		for(var i=0,len=data.length;i<len;i+=step){
			avg = cnt = 0
			for(var j=i;j<i+step;j++){
				if(!data[j]) break;
				avg += parseFloat(data[j][type]) ? parseFloat(data[j][type]) - min : 0;
				cnt++;
			}
			if(cnt != 0) avg = avg/cnt;
			renderData.push(avg);
			renderTime.push(data[i]['UPD_DT']);
		}
		width = renderData.length;
	}
	if(canvas.width > width){
		move_left_by = canvas.width/width;
	}
	var plusHeight = canvas.height*0.1;
	context.scale(0.9,0.85);
	context.translate(canvas.width*0.075, 0);
	var rowHeight = parseInt((canvas.height)/5);
	var statHeight = max/5;
	var commentMax = max+min;
	var fs = 15;
	var fontStyle = "15px Arial";
	if($(window).width() < 1200){
		fs = fs*($(window).width()/1200)  + "px";
	}
	context.font = fs+"px Arial";
	context.fillStyle = "#666";
	for(var i=0;i<=5; i++){
		var row = canvas.height - (rowHeight*i) + plusHeight;
		var text = parseInt((min+(statHeight*i))*100)/100
		text += bus.unit[type];
		context.beginPath();
		context.moveTo(0,row);
		context.lineTo(canvas.width,row);
		context.strokeStyle = '#bebebe';
		context.lineWidth = 1;
		context.lineCap = 'round';
		context.stroke();
		context.fillText(text,-75,row+5);
	}
	var len=renderTime.length;
	var renderTime2 = [];
	var num = 0;
	var wr = parseInt(canvas.width/12);
	var plusStep = parseInt(len/12)+1;
	for(var i=0;i<=len;i+=plusStep){
		var date = new Date(renderTime[i]);
		var month = date.getMonth()+1;
		var day = date.getDate();
		var hour = date.getHours();
		var minutes = date.getMinutes();
		var leftPoint = (wr*num++)+30;
		var newDate;
		if(month < 10) month = "0"+month;
		if(day < 10) day = "0"+day;
		if(hour < 10) hour = "0"+hour;
		if(minutes < 10) minutes = "0"+minutes;
		newDate = month+"-"+day+" "+hour+":"+"00";
		if(len<700){
			newDate = month+"-"+day+" "+hour+":"+minutes;
		}
		context.fillText(newDate,leftPoint,canvas.height+plusHeight+25);
	}
	var left = 0,
		prev_stat = canvas.height - (renderData[0]*ratio) + plusHeight;
	for(var i=0,len=renderData.length;i<len;i++) {
		the_stat = canvas.height - (renderData[i]*ratio) + plusHeight;
		context.beginPath();
		context.moveTo(left, prev_stat);
		context.lineTo(left+move_left_by, the_stat);
		context.lineWidth = 3;
		context.lineCap = 'round';
		context.lineJoin = 'round';
		context.strokeStyle = '#339cd0';
		context.stroke();
		prev_stat = the_stat;
		left += move_left_by;
	}
}

function miniMap() {
	var nowIndoor = bus.homeData.nowIndoor;
    if(!nowIndoor) return;
    var x = nowIndoor.DVC_GIS_X;
    var y = nowIndoor.DVC_GIS_Y;
    var map = new google.maps.Map(document.getElementById('mini_map'),{
        zoom: 19,
        center: new google.maps.LatLng(y,x),
        mapTypeId: 'roadmap'
    });
    bus.mini_map = map;
    bus.homeData.today_list.forEach(function(doors){
        var x = doors.DVC_GIS_X;
        var y = doors.DVC_GIS_Y;
        var pos = new google.maps.LatLng(y, x);
        var icon = './public/img/icon-tumbler2-mini.png';
        if(doors.DVC_CD == 03) icon = './public/img/icon-tumbler1-mini.png';
        var marker = new google.maps.Marker({
            position: pos,
            icon:icon,
            map: map,
        });
        makerCircle.prototype = new google.maps.OverlayView();
        makerCircle.prototype.door = doors;
        makerCircle.prototype.draw = draw;
        makerCircle.prototype.remove = remove;
        makerCircle.prototype.getPosition = getPosition;
        makerCircle.prototype.onAdd = onAdd;
        var circle = new makerCircle(map,pos);
    })
    function makerCircle(map, pos){
        this.latlng = pos;
        this.setMap(map);
    }
    function onAdd(){
        var self = this;
        var div = this.div;
        var color = {
            'color1':'#339cd0',
            'color2':'#8fd400',
            'color3':'#ffbe23',
            'color4':'#ff6961',
        }
        div = this.div = document.createElement('div');
        div.style.width = '30px';
        div.style.height = '30px';
        div.style.borderRadius = '15px';
        div.style.color = '#fff';
        div.style.fontSize = '12px';
        div.style.lineHeight = '30px';
        div.style.textAlign = 'center';
        div.style.position = 'absolute';
        div.style.zIndex = 1000;
        div.style.backgroundColor = color[this.door.color];
        div.innerHTML = this.door.score
    }
    function draw(){
        var point = this.getProjection().fromLatLngToDivPixel(this.latlng);
        this.div.style.left = (point.x+10) + 'px';
        this.div.style.top = (point.y-20) + 'px';
        var panes = this.getPanes();
        panes.overlayImage.appendChild(this.div);
    }
    function remove() {
        if (this.div) {
            this.div.parentNode.removeChild(this.div);
            this.div = null;
        }
    }
    function getPosition() {
        return this.latlng;
    };
}

function initMap() {
	if(!bus.activeData) return;
	var x = bus.activeData.DVC_GIS_X;
	var y = bus.activeData.DVC_GIS_Y;
	var map = new google.maps.Map(document.getElementById('map'), {
	  zoom: 19,
	  center: new google.maps.LatLng(y,x),
	  mapTypeId: 'roadmap'
	});
	bus.map = map;
	var 
		indoorTemplate = getTemplate('indoorInfo'),
		outdoorTemplate = getTemplate('outdoorInfo'),
		indoorPositionList = [],
		outdoorPositionList = [];
	bus.indoor.forEach(function(indoor){
		var x = indoor.DVC_GIS_X;
		var y = indoor.DVC_GIS_Y;
		//if(indoorPositionList.indexOf(x+"/"+y) != -1) return;
		var pos = new google.maps.LatLng(y, x);
		indoorPositionList.push(x+"/"+y);
		var marker = new google.maps.Marker({
			position: pos,
			icon: './public/img/icon-tumbler2.png',
			map: map,
		});
		var template = indoorTemplate
						.replace('{{name}}',indoor.DVC_NM)
						.replace('{{color}}',indoor.color)
						.replace('{{temp}}',indoor.temp)
						.replace('{{hum}}',indoor.hum)
						.replace('{{dust}}',indoor.dust)
						.replace('{{co2}}',indoor.co2)
						.replace('{{tvoc}}',indoor.tvoc)
						.replace('{{score}}',indoor.score)
		var infowindow = new google.maps.InfoWindow({
			content: template,
		});
		marker.addListener('click',function(){
			if(bus.prevwindow != false) bus.prevwindow.close();
			bus.prevwindow = infowindow;
			infowindow.open(map, marker);
		})
		bus.infowindow[indoor.DVC_NM] = [infowindow,marker];
		makerCircle.prototype = new google.maps.OverlayView();
		makerCircle.prototype.door = indoor;
		makerCircle.prototype.draw = draw;
		makerCircle.prototype.remove = remove;
		makerCircle.prototype.getPosition = getPosition;
		makerCircle.prototype.onAdd = onAdd;
		var circle = new makerCircle(map,pos);
	})
	bus.outdoor.forEach(function(outdoor){
		var x = outdoor.DVC_GIS_X;
		var y = outdoor.DVC_GIS_Y;
		//if(outdoorPositionList.indexOf(x+"/"+y) != -1) return;
		var pos = new google.maps.LatLng(y, x);
		outdoorPositionList.push(x+"/"+y);
		var marker = new google.maps.Marker({
			position: pos,
			icon: './public/img/icon-tumbler1.png',
			map: map,
		});
		var template = outdoorTemplate
						.replace('{{name}}',outdoor.DVC_NM)
						.replace('{{color}}',outdoor.color)
						.replace('{{temp}}',outdoor.temp)
						.replace('{{hum}}',outdoor.hum)
						.replace('{{dust}}',outdoor.dust)
						.replace('{{score}}',outdoor.score)
		var infowindow = new google.maps.InfoWindow({
			content: template,
		});
		marker.addListener('click',function(){
			if(bus.prevwindow != false) bus.prevwindow.close();
			bus.prevwindow = infowindow;
			infowindow.open(map, marker);
		})
		bus.infowindow[outdoor.DVC_NM] = [infowindow,marker];
		makerCircle.prototype = new google.maps.OverlayView();
		makerCircle.prototype.door = outdoor;
		makerCircle.prototype.draw = draw;
		makerCircle.prototype.remove = remove;
		makerCircle.prototype.getPosition = getPosition;
		makerCircle.prototype.onAdd = onAdd;
		var circle = new makerCircle(map,pos);
	})
	map.addListener('click', function() {
    	if(bus.prevwindow != false) bus.prevwindow.close();
    });
	map.addListener('drag', function() {
    	if(bus.prevwindow != false) bus.prevwindow.close();
    });
	function makerCircle(map, pos){
		this.latlng = pos;
		this.setMap(map);
	}
	function onAdd(){
		var self = this;
		var div = this.div;
		var color = {
			'color1':'#339cd0',
			'color2':'#8fd400',
			'color3':'#ffbe23',
			'color4':'#ff6961',
		}
		div = this.div = document.createElement('div');
		div.style.width = '40px';
		div.style.height = '40px';
		div.style.borderRadius = '20px';
		div.style.color = '#fff';
		div.style.fontSize = '18px';
		div.style.lineHeight = '40px';
		div.style.textAlign = 'center';
		div.style.position = 'absolute';
		div.style.zIndex = 1000;
		div.style.backgroundColor = color[this.door.color];
		div.innerHTML = this.door.score
	}
	function draw(){
		var point = this.getProjection().fromLatLngToDivPixel(this.latlng);
		this.div.style.left = (point.x+10) + 'px'
		this.div.style.top = (point.y-20) + 'px'
		var panes = this.getPanes();
        panes.overlayImage.appendChild(this.div);
	}
	function remove() {
		if (this.div) {
			this.div.parentNode.removeChild(this.div);
			this.div = null;
		}
	}
	function getPosition() {
		return this.latlng;	
	};
}


$(document)
.on("click","a[href='#']",function(e){
	e.preventDefault();
})
.on("change",".datepicker",function(){
	var selectedDate = getDate(this);
	if($(this).hasClass("start")){
		$(".datepicker.end").datepicker("option","minDate",selectedDate);
	} else {
		$(".datepicker.start").datepicker("option","maxDate",selectedDate);
	}
})
.on("click",".gnb li",function(){
	var target = $(this).data("target");
	if(target == '.home') {
		$(".gnb li.active").removeClass("active");
		$(this).addClass("active");
        return false;
    }
	var _this = $(this);
	if($(target).length){
		var top = $(target).offset().top-120;
		$("html,body").stop().animate({
			scrollTop:top
		},1000)
	}
})
$.datepicker.setDefaults({
    dateFormat: 'yy-mm-dd',
    showMonthAfterYear: true,
    changeMonth:true,
    changeYear:true,
    maxDate:new Date()
})

$(window).on("scroll load",function(){
	if(bus.isHome == false) if($(".content-01,.content-02,.content-03,.content-04,.content-05").length){
		var ofs1 = $(".content-01").offset().top
		var ofs2 = $(".content-04").offset().top
		var ofs3 = $(".content-05").offset().top;
		var ofs4 = ofs3 + $(".content-05").height();
		var wt = $(window).scrollTop() + 140;
		var btmChk = $(document).height() - $(window).height() - $(window).scrollTop();
		if(wt > ofs1 && wt < ofs2){
			if(!$(".target-content-01.active").length){
				$(".gnb .active").removeClass("active");
				$(".target-content-01").addClass("active");
			}
		} else if(wt > ofs2 && wt < ofs3){
			if(!$(".target-content-04.active").length){
				$(".gnb .active").removeClass("active");
				$(".target-content-04").addClass("active");
			}
		} else if(wt > ofs3){
			if(!$(".target-content-05.active").length){
				$(".gnb .active").removeClass("active");
				$(".target-content-05").addClass("active");
			}
		}
		if(btmChk == 0) if(!$(".target-content-05.active").length){
			$(".gnb .active").removeClass("active");
			$(".target-content-05").addClass("active");
		}
	}
})