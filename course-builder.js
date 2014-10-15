#!/usr/bin/env node

var fs = require('fs');
var _ = require('underscore');
var colors  = require('colors');
var program = require('commander');

program
  .version('0.0.1')
  .usage('[option] [command]')
  .option('-i, --import <file>', 'import json file')
  .option('-p, --print', 'print json content to stdout .')
  .option('ls, list [id]', "list")
  .option('mv, move [id] [id]', "move")
  .option('rm, remove [id]', "delete")
  .parse(process.argv);

function _id(obj){
  if(!obj) return null;
  var _id = obj._id;
  if(!_id) return null;
  return _id.$oid;
};

function findById(obj, prop, id){
  return _.find( obj[ prop ] , function(item){
    return _id(item) == id;
  });
}

var data;

if(program.import){
  data = JSON.parse( fs.readFileSync(program.import, { encoding: 'utf8' }));
}else{
  program.help();
}

if(program.list){
  var ids = program.list == true ? [] :  program.list.split('/');
  switch(ids.length){
    case 0:
      console.log('chapters:');
      data.forEach(function(chapter){
        console.log('%s %s', _id(chapter).green, chapter.name);
      });
      break;
    case 1:
      var chapter = findById({ chapters : data}, 'chapters', ids[0]);
      if(chapter){
        console.log('layers:');
        chapter.layers.forEach(function(layer){
          console.log('%s %s', _id(layer).green, layer.title);
        }); 
      }else{
        var map = {
          layer: 'lessons',
          lesson: 'activities',
          activity: 'problems'
        };
        var result = fuzzFinder(ids[0]);
        var list = result.data[ map[result.type] ];
        if(list){
          console.log('%s:', map[ result.type ]);
          list.forEach(function(item){
            console.log('%s %s', _id(item).green, item.title || JSON.stringify(item));  
          });
        }else{
          console.error('chapter %s was not found .'.red, ids[0]);
        }
      }
      break;
    case 2:
      var chapter = findById({ chapters : data}, 'chapters', ids[0]);
      var layer = findById(chapter,'layers', ids[1]);
      console.log('lessons:');
      layer.lessons.forEach(function(lesson){
        console.log('%s %s', _id(lesson).green, lesson.title);
      });
      break;
    case 3:
      var chapter = findById({ chapters : data}, 'chapters', ids[0]);
      var layer = findById(chapter,'layers', ids[1]);
      var lesson = findById(layer,'lessons', ids[2]);
      console.log('activities:');
      lesson.activities.forEach(function(activity){
        console.log('%s %s', _id(activity).green, activity.title);
      });     
      break;
    case 4:
      var chapter = findById({ chapters : data}, 'chapters', ids[0]);
      var layer = findById(chapter,'layers', ids[1]);
      var lesson = findById(layer,'lessons', ids[2]);
      var activity = findById(lesson, 'activities', ids[3]);
      console.log('problems:');
      activity.problems.forEach(function(problem){
        console.log('%s %s', _id(problem).green, problem.body);
      });
      break;
  }
}

function fuzzFinder(id){
  for(var i in data){
    var chapter = data[i];
    if(_id(chapter) == id)return { type: 'chapter', index: i, data: chapter };
    for(var j in chapter.layers){
      var layer = chapter.layers[j];
      if(_id(layer) == id)return { type: 'layer', index: j, data: layer }
      for(var k in layer.lessons){
        var lesson = layer.lessons[k];
        if(_id(lesson) == id) return { type: 'lesson', index: k, data: lesson };
        for(var m in lesson.activities){
          var activity = lesson.activities[m];
          if(_id(activity) == id) return { type: 'activity', index: m, data: activity };
          for(var n in activity.problems){
            var problem = activity.problems[n];
            if(_id(problem) == id) return { type: 'problem', index: n, data: problem, parent: activity.problems };
          }
        }
      }
    }
  }
}

if(program.remove){
  var id = program.remove;
  var result =  indexBy(id);
  data.splice(result.index, 1);
}

function getValueFromProp(obj, prop){
  var props = prop.split('.'); 
  var get = function(d, p){
    return d[p];
  }
  var tmp = data;
  props.forEach(function(p){
    tmp = get(tmp, p);  
  });
  return tmp;
}

if(program.move){
  var id = program.move;  
  var result = fuzzFinder(id);
  if(!result){
    return console.error('can not found %s .', id.red);
  }
  if(program.args.length == 0){
    return console.error('must be specify dest id .'.red);
  }
  var dest_id = program.args[0];
  var dest = fuzzFinder(dest_id);
  if(!dest) return console.error('can not found %s .', dest_id.red);
  if(result.type == 'problem' && dest.type == 'activity'){
    result.data.parent_id = _id(dest.data);
    dest.data.problems.push(result.data);
    result.parent.splice(result.index, 1);
  }else{
    console.log("can not move %s to %s .".red, result.type, dest.type);
  }
}

if(program.print){
  console.log( JSON.stringify(data) );
}
 
fs.writeFile(program.import, JSON.stringify(data, null, 4), function(err) {
    if(err) {
      console.error('can not save json to file : %s'.red, err);
    }
}); 
