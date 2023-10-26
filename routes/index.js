var express = require('express');
var router = express.Router();
var User = require('../models/user');

router.get('/', function (req, res, next) {
	return res.render('index.ejs');
});


router.post('/', function(req, res, next) {
	console.log(req.body);
	var personInfo = req.body;


	if(!personInfo.email || !personInfo.username || !personInfo.password || !personInfo.passwordConf){
		res.send();
	} else {
		if (personInfo.password == personInfo.passwordConf) {

			User.findOne({email:personInfo.email},function(err,data){
				if(!data){
					var c;
					User.findOne({},function(err,data){

						if (data) {
							console.log("if");
							c = data.unique_id + 1;
						}else{
							c=1;
						}

						var newPerson = new User({
							unique_id:c,
							email:personInfo.email,
							username: personInfo.username,
							password: personInfo.password,
							passwordConf: personInfo.passwordConf
						});

						newPerson.save(function(err, Person){
							if(err)
								console.log(err);
							else
								console.log('Success');
						});

					}).sort({_id: -1}).limit(1);
					res.send({"Success":"You are regestered,You can login now."});
				}else{
					res.send({"Success":"Email is already used."});
				}

			});
		}else{
			res.send({"Success":"password is not matched"});
		}
	}
});

router.get('/login', function (req, res, next) {
	return res.render('login.ejs');
});

router.post('/login', function (req, res, next) {
	const { email, password } = req.body;
  
	User.findOne({ email: email }, function (err, data) {
	  if (data) {
		if (data.password == password) {
		  req.session.userId = data.unique_id;
		  res.send({ "Success": "Success!" });
		} else {
		  res.send({ "Success": "Wrong password!" });
		}
	  } else {
		res.send({ "Success": "This Email Is not registered!" });
	  }
	});
  });
  

function isAuthenticated(req, res, next) {
	if (req.session && req.session.userId) {
	  next(); 
	} else {
	  res.redirect('/login'); 
	}
  }
  
  router.get('/profile', isAuthenticated, async (req, res) => {
	  User.findOne({ unique_id: req.session.userId }, async function (err, data) {
		console.log(data);
		if (!data) {
		  res.redirect('/');
		} else if (data.email === 'admin@gmail.com' && data.password === 'admin') {
			const License = require('../models/license');
			const licenses = await License.find({ pending: true });
			return res.render('admin.ejs', { licenses });
		} else {
			console.log(data);
		  return res.render('data.ejs', { "name": data.username, "email": data.email });
		}
	  });
  });
  

  router.post('/admin/accept-license/:id', async (req, res) => {
	try {
	  const licenseId = req.params.id;
  
	  // Update the license's pending status to false
	  const License = require('../models/license');
	  await License.findByIdAndUpdate(licenseId, { pending: false });
  
	  res.redirect('/admin');
	} catch (err) {
	  console.error('Error accepting license:', err);
	  res.status(500).send('Internal Server Error');
	}
  });
  
  router.post('/admin/deny-license/:id', async (req, res) => {
	try {
	  const licenseId = req.params.id;
  
	  // Update the license's pending status to false
	  const License = require('../models/license');
	  await License.findByIdAndUpdate(licenseId, { pending: false });
  
	  res.redirect('/admin');
	} catch (err) {
	  console.error('Error denying license:', err);
	  res.status(500).send('Internal Server Error');
	}
  });
  

router.get('/logout', function (req, res, next) {
	console.log("logout")
	if (req.session) {
    // delete session object
    req.session.destroy(function (err) {
    	if (err) {
    		return next(err);
    	} else {
    		return res.redirect('/');
    	}
    });
}
});

router.get('/forgetpass', function (req, res, next) {
	res.render("forget.ejs");
});

router.post('/forgetpass', function (req, res, next) {
	//console.log('req.body');
	//console.log(req.body);
	User.findOne({email:req.body.email},function(err,data){
		console.log(data);
		if(!data){
			res.send({"Success":"This Email Is not regestered!"});
		}else{
			// res.send({"Success":"Success!"});
			if (req.body.password==req.body.passwordConf) {
			data.password=req.body.password;
			data.passwordConf=req.body.passwordConf;

			data.save(function(err, Person){
				if(err)
					console.log(err);
				else
					console.log('Success');
					res.send({"Success":"Password changed!"});
			});
		}else{
			res.send({"Success":"Password does not matched! Both Password should be same."});
		}
		}
	});
	
});


router.get('/add-dataset', isAuthenticated, async (req, res) => {
  try {
    // Fetch license names from MongoDB
	const License = require('../models/license');
    const licenses = await License.find({ pending: false }, 'name').exec();
	console.log('Licenses:', licenses);

    // Render the 'dataset.ejs' template and pass the 'licenses' data
    res.render('dataset.ejs', { licenses });
  } catch (err) {
    console.error('Error fetching licenses:', err);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/add-dataset', async (req, res) => {
	try {
	  
	  const { name, fileLink, license } = req.body;
	  const count = 0;
  
	  console.log(license.trim()); // Log the selected license for debugging

	  const License = require('../models/license');
	  const { Dataset } = require('../models/dataset');

	  const foundLicense = await License.findOne({ name : license}).exec();
	
	  if (!foundLicense) {
		console.log('License not found:', license); // Log the license that was not found
		res.status(400).send('License not found');
		return;
	  }
  
	  const newDataset = new Dataset({
		name,
		fileLink,
		count,
		license: foundLicense._id, // Use the _id of the foundLicense as the reference
	  });
  
	  console.log(newDataset); // Log the new dataset for debugging
  
	  await newDataset.save();
  
	  res.status(200).send('Dataset created successfully');
	} catch (err) {
	  console.error('Error creating dataset:', err); // Log the error for debugging
	  res.status(500).send('Internal Server Error');
	}
	
  });
  

router.get('/custom-license', isAuthenticated, async(req, res) => {
	res.render('customLicense.ejs');
})

router.post('/custom-license', async (req, res) => {
    try {
        const { name, info } = req.body;
		const pending = true;
        // Create a new custom license object
		const License = require('../models/license');
        const newLicense = new License({
            name,
            info,
			pending,
        });

        // Save the license to the database
        await newLicense.save();
		

        res.status(200).send('Template sent for approval');
    } catch (err) {
        console.error('Error creating custom license:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/datasets', isAuthenticated, async (req, res) => {
    try {
        // Retrieve all datasets, populating the 'license' field to get license details
		const { Dataset } = require('../models/dataset');
        const datasets = await Dataset.find().populate('license').exec();
		console.log(datasets);
        
        res.render("alldatasets.ejs", { datasets });
    } catch (err) {
        console.error('Error loading datasets:', err);
        res.status(500).send('Internal Server Error');
    }
});
  

module.exports = router;