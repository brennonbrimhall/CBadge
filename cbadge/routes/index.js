var express = require('express');
var router = express.Router();

// var badge = require('../helpers/badge');
// var request = require('request');
// var cheerio = require('cheerio');

/* GET home page. */
router.get('/', function(req, res) {
  //Blank home page
  res.send(204);
});

//Rounds number n to number of significant figures sig.
function sigFigs(n, sig) {
    var mult = Math.pow(10,
        sig - Math.floor(Math.log(n) / Math.LN10) - 1);
    return Math.round(n * mult) / mult;
}

//Get action on a per-branch or tag basis
router.get('/:project/:action/:owner/:repo/:tag', function(req, res) {
    var request = require('request');
    var badge = require('../helpers/badge');
    var authenticate = require('../helpers/authenticate');
    var packageJSON = require('../package.json');

    var options = {
        url: 'https://api.github.com/repos/'+req.params.owner+'/'+req.params.repo+'/commits/'+req.params.tag,
        headers: {
            'User-Agent': 'CBadge/'+packageJSON.version,
            'Authorization': authenticate()
        }
    };

    request(options, function (error, response, body) {
        if(error){
            res.send(500);
        }else{
            console.log(body);
            var sha = JSON.parse(body).sha;

            res.redirect('/'+req.params.project+'/'+req.params.action+'/'+sha);
        }
    })
});

//Get coverage on a per-revision basis
router.get('/:project/coverage/:revision', function(req, res) {
    var request = require('request');
    var badge = require('../helpers/badge');

    request('http://open.cdash.org/api/?method=build&task=revisionstatus&project='+req.params.project+'&revision='+req.params.revision, function (error, response, body) {
        if (error){
            res.send(500);
        }else{
            var coverage = JSON.parse(body);
            var loctested = 0;
            var locuntested = 0;
            var buildswithcoverage = 0;
            for(var i = 0; i < coverage.length; i++){
                if( coverage[i].loctested != null &&
                    Number(coverage[i].loctested) &&
                    coverage[i].locuntested != null &&
                    Number(coverage[i].locuntested)){

                    loctested += coverage[i].loctested;
                    locuntested += coverage[i].locuntested;
                }
            }
            if(loctested + locuntested > 0){
                var percent = loctested/(loctested+locuntested);
                percent = sigFigs(percent, 3);
                percent *= 100;
                if(percent > 80){
                    res.redirect(badge('coverage', percent+'%', 'brightgreen'));
                }else if(percent > 60){
                    res.redirect(badge('coverage', percent+'%', 'yellow'));
                }else{
                    res.redirect(badge('coverage', percent+'%', 'red'));
                }
            }else{
                res.redirect(badge('coverage', 'unknown', 'lightgrey'));
            }
        }
    });
});

//Get build status on a per-revision basis
router.get('/:project/build/:revision', function(req, res) {
    var request = require('request');
    var badge = require('../helpers/badge');

    request('http://open.cdash.org/api/?method=build&task=revisionstatus&project='+req.params.project+'&revision='+req.params.revision, function (error, response, body) {
        if (error){
            res.send(500);
        }else{
            var builds = JSON.parse(body);
            var buildErrors = 0;
            var buildWarnings = 0;

            if(builds.length > 0){
                for(var i = 0; i < builds.length; i++){
                    if(Number(builds[i].builderrors)){
                        buildErrors += Number(builds[i].builderrors);
                    }
                    if(Number(builds[i].buildwarnings)){
                        buildWarnings += Number(builds[i].buildwarnings);
                    }
                }

                if(Number(buildErrors) > 0){
                    res.redirect(badge('build', buildErrors+' errors', 'red'));
                }else if(Number(buildWarnings) > 0){
                    res.redirect(badge('build', buildWarnings+' warnings', 'yellow'));
                }else{
                    res.redirect(badge('build', 'passing', 'brightgreen'));
                }
            }else{
                res.redirect(badge('build', 'unknown', 'lightgrey'));
            }


        }
    });
});


//Get configure status on a per-revision basis
router.get('/:project/configure/:revision', function(req, res) {
    var request = require('request');
    var badge = require('../helpers/badge');

    request('http://open.cdash.org/api/?method=build&task=revisionstatus&project='+req.params.project+'&revision='+req.params.revision, function (error, response, body) {
        if (error){
            res.send(500);
        }else{
            var builds = JSON.parse(body);
            var configureErrors = 0;
            var configureWarnings = 0;

            if(builds.length > 0){
                for(var i = 0; i < builds.length; i++){
                    if(Number(builds[i].configureerrors)){
                        configureErrors += Number(builds[i].configureerrors);
                    }
                    if(Number(builds[i].configurewarnings)){
                        configureWarnings += Number(builds[i].configurewarnings);
                    }
                }

                if(Number(configureErrors) > 0){
                    res.redirect(badge('configure', configureErrors+' errors', 'red'));
                }else if(Number(configureWarnings) > 0){
                    res.redirect(badge('configure', configureWarnings+' warnings', 'yellow'));
                }else{
                    res.redirect(badge('configure', 'passing', 'brightgreen'));
                }
            }else{
                res.redirect(badge('build', 'unknown', 'lightgrey'));
            }


        }
    });
});


//Get test status on a per-revision basis
router.get('/:project/test/:revision', function(req, res) {
    var request = require('request');
    var badge = require('../helpers/badge');

    request('http://trunk.cdash.org/api/?method=build&task=revisionstatus&project='+req.params.project+'&revision='+req.params.revision, function (error, response, body) {
        if (error){
            res.send(500);
        }else{
            var builds = JSON.parse(body);
            var testsPassed = 0;
            var testsFailed = 0;
            var testsNotRun = 0;

            for(var i = 0; i < builds.length; i++){
                if(Number(builds[i].testpassed)){
                    testsPassed += Number(builds[i].testpassed);
                }
                if(Number(builds[i].testfailed)){
                    testsFailed += Number(builds[i].testfailed);
                }
                if(Number(builds[i].testnotrun)){
                    testsNotRun += Number(builds[i].testnotrun);
                }
            }

            if(testsPassed+testsNotRun+testsFailed > 0){
                var percent = (testsPassed)/(testsPassed+testsNotRun+testsFailed);
                percent = sigFigs(percent, 3);
                percent *= 100;
                if(percent > 80){
                    res.redirect(badge('tests', percent+'%', 'brightgreen'));
                }else if (percent > 60){
                    res.redirect(badge('tests', percent+'%', 'yellow'));
                }else{
                    res.redirect(badge('tests', percent+'%', 'red'));
                }
            }else{
                res.redirect(badge('tests', 'unknown', 'lightgrey'));
            }
        }
    });
});

module.exports = router;
