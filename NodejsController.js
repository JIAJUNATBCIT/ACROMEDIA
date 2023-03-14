// Nodejs example

const User = require('../Models/User');
var passport = require('passport');
const JWT = require('jsonwebtoken')
const RequestService = require('../Services/RequestService');
const UserRepo = require('../Data/UserRepo');
const TicketRepo = require('../Data/TicketRepo');
const _userRepo = new UserRepo();
const _ticketRepo = new TicketRepo();
const EmailService = require('../Services/EmailService');
const {userLogger, activityLogger} = require('../Services/LogService');

// Configure the token.
const jwtSecret = 'QOOC3nUVl9yTZiH2F0VYjOJhwm2ZkyBjWK7Mzo4bH54cNBBUQmp262S0Tx1eBBTT'
const jwtAlgorithm = 'HS256'
const jwtExpiresIn = '10h'

const fs = require('fs');
const Hongan = require('hogan.js');
const template_forgotusername = fs.readFileSync('././email_templates/user_forgot_username.hjs', 'utf-8');
const template_forgotpassword = fs.readFileSync('././email_templates/user_forgot_password.hjs', 'utf-8');
const template_resetpassword = fs.readFileSync('././email_templates/user_reset_password.hjs', 'utf-8');
const compiled_forgotusername = Hongan.compile(template_forgotusername);
const compiled_forgotpassword = Hongan.compile(template_forgotpassword);
const compiled_resetpassword = Hongan.compile(template_resetpassword);

// Handles 'POST' with registration form submission.
exports.RegisterUser = async function (req, res) {
    var password = req.body.password;
    var passwordConfirm = req.body.passwordConfirm;

    if (password == passwordConfirm) {

        // Creates user object with mongoose model.
        // Note that the password is not present.
        var newUser = new User({
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            username: req.body.username,
            office: req.body.office,
            phonenumber: req.body.phonenumber,
            jobtitle: req.body.jobtitle,
            linkedin: req.body.linkedin,
            certificates: req.body.certificates,
            roles: req.body.roles
        });

        // Uses passport to register the user.
        // Pass in user object without password
        // and password as next parameter.
        newUser.setPassword(req.body.password)
        let responseObject = await _userRepo.create(newUser)
        if (responseObject.errorMessage) {
            activityLogger.info(req.body.username + " is registered")
            res.json({ errorMessage: responseObject.errorMessage });
        } else {
            res.json({ errorMessage: "" });
        }
    }
    else {
        res.json({ errorMessage: "Passwords do not match." })
    }
};

exports.Login = async function (req, res) {
    const username = req.body.username
    const password = req.body.password
    let responseObject = await _userRepo.getUserByUsername(username);
    if (responseObject.responseObj
        && responseObject.responseObj.validPassword(password)) {
        const token = JWT.sign(
            // payload
            {
                username: responseObject.responseObj.username,
                roles: responseObject.responseObj.roles
            },
            // secret
            jwtSecret,
            {
                algorithm: jwtAlgorithm,
                expiresIn: jwtExpiresIn,
                subject: responseObject.responseObj._id.toString()
            }
        )
        //console.log(JSON.stringify(responseObject.responseObj))
        activityLogger.info(req.body.username + " - login")
        res.json({ user: responseObject.responseObj, token: token, errorMessage: "" });
    } else {
        res.json({ errorMessage: "Invalid Username or Password" });
    }
}

// Handles 'POST' with update form submission.
exports.UpdateUser = async function (req, res) {
    let reqInfo = await RequestService.jwtReqHelper(req, ['Admin', 'HR', 'Manager', 'General']);
    if (reqInfo.rolePermitted) {
        let tempUserObj = new User({
            firstname: req.body.obj.firstname,
            lastname: req.body.obj.lastname,
            email: req.body.obj.email,
            username: req.body.obj.username,
            office: req.body.obj.office,
            phonenumber: req.body.obj.phonenumber,
            jobtitle: req.body.obj.jobtitle,
            linkedin: req.body.obj.linkedin,
            certificates: req.body.obj.certificates,
            roles: req.body.obj.roles,
            password: req.body.obj.password
        })
        //Call update() function in repository with the object.
        let responseObject = await _userRepo.updateUser(tempUserObj);
        //Update was successful. Show detail page with updated object.
        if (responseObject.errorMessage == "") {
            activityLogger.info(req.user.username + " - User updated: " + req.body.obj.username);
            res.json({ user: responseObject.obj, errorMessage: "" });
        }
        //Update not successful. Show edit form again.
        else {
            res.json({ user: responseObject.obj, errorMessage: responseObject.errorMessage });
        }
    }
}

// Get all IT staff
exports.GetAllITStaff = async function (req, res) {
    let reqInfo = await RequestService.jwtReqHelper(req, ['Admin', 'HR', 'Manager']);
    if (reqInfo.rolePermitted) {
        let all_ITers = await _userRepo.getAllITers();
        res.json({ ITers: all_ITers })
    }
}

// This function returns data to Manager only
exports.GetAllUsers = async function (req, res) {
    let reqInfo = await RequestService.jwtReqHelper(req, ['Admin', 'HR', 'Manager']);
    if (reqInfo.rolePermitted) {
        let all_users = await _userRepo.getAllUsers();
        res.json({ all_users: all_users })
    }
}


// This function returns data to logged in users only.
exports.Profile = async function (req, res) {
    let reqInfo = await RequestService.jwtReqHelper(req, ['Admin', 'HR', 'Manager', 'General']);
    if (reqInfo.rolePermitted) {
        let response = await _userRepo.getUserByUsername(reqInfo.username)
        if (response.errorMessage == "") {
            res.json({ errorMessage: response.errorMessage, user: response.responseObj })
        } else {
            res.json({ errorMessage: response.errorMessage, user: null })
        }
    }
    else {
        res.json({
            errorMessage: '/User/Login?errorMessage=You ' +
                'must be logged in to view this page.'
        })
    }
}

exports.GetUserByEmail = async function (req, res) {
    let email = req.body.obj
    let response = await _userRepo.getUserByEmail(email)
    res.json({ user: response.responseObj, errorMessage: response.errorMessage })
}

exports.checkUsername = async function (req, res) {
    let username = req.body.obj
    let response = await _userRepo.getUserByUsername(username)
    res.json({ user: response.responseObj, errorMessage: response.errorMessage })
}

exports.ForgotUsername = async function (req, res) {
    let email = req.body.email
    let response = await _userRepo.getUserByEmail(email)
    if (response.errorMessage == "") {
        let emailObj = {
            mailto: email,
            subject: "Find your Username",
            html: compiled_forgotusername.render({
                firstname: response.responseObj.firstname,
                username: response.responseObj.username
            })
        }
        activityLogger.info(username + " - forgot username");
        EmailService.sendMail(emailObj);
    } 
    res.json({ errorMessage: response.errorMessage })
}

exports.DelUser = async function (req, res) {
    let reqInfo = await RequestService.jwtReqHelper(req, ['Admin', 'HR', 'Manager']);
    if (reqInfo.rolePermitted) {
        // Delete User's tickets
        let response = await _ticketRepo.delTicketsByUsername(req.body.obj.username);
        if (response.errorMessage == '') {
            // Delete User's profile
            response = await _userRepo.deleteUser(req.body.obj.username);
            if (response.errorMessage == '') {
                activityLogger.info(req.user.username + " - User deleted: " + req.body.obj.username);
                res.json({ errorMessage: response.errorMessage, users: response.users });
            } else {
                res.json({ errorMessage: response.errorMessage, users: [] });
            }
        } else {
            res.json({ errorMessage: response.errorMessage, users: [] });
        }
    } else {
        res.json({
            errorMessage: '/User/Login?errorMessage=You ' +
                'must be logged in to view this page.'
        });
    }
}

exports.ForgotPassword = async function (req, res) {
    let email = req.body.email
    let userObj = await _userRepo.getUserByEmail(email)
    let errorMessage = ''
    if (userObj.errorMessage == "") {
        const token = JWT.sign(
            // payload
            {
                username: userObj.responseObj.username,
                roles: userObj.responseObj.roles
            },
            // secret
            jwtSecret,
            {
                algorithm: jwtAlgorithm,
                expiresIn: '2h',
                subject: userObj.responseObj._id.toString()
            }   
        )
        let emailObj = {
            mailto: email,
            subject: "Find your Password",
            html: compiled_forgotpassword.render({
                firstname: userObj.responseObj.firstname,
                token: token
            })
        }
        let resetObj = await _userRepo.updateResetLink(userObj.responseObj, token)
        if(resetObj.errorMessage == "") {
            activityLogger.info(userObj.responseObj.username + " - forgot password");
            EmailService.sendMail(emailObj);
        } else {
            errorMessage = resetObj.errorMessage
        }
    } else {
        errorMessage = userObj.errorMessage;
    }
    res.json({ errorMessage: errorMessage })  
}

exports.ResetPassword = async function (req, res) {
    const {resetLink, newPass, email} = req.body
    let errorMessage = "";
    if(resetLink) {
        JWT.verify(resetLink, jwtSecret, function(error) {
            if(error) {
                errorMessage = "Incorrent Token or the link is expired."
            }
        })
        if(errorMessage == '') {
            let resObj = await _userRepo.resetUserPassword(resetLink, newPass)
            if(resObj.errorMessage == "") {
                // When successfully reset(updated) user's password, send an email to the user
                let emailObj = {
                    mailto: resObj.user.email,
                    subject: "Password reset",
                    html: compiled_resetpassword.render({
                        firstname: resObj.user.firstname,
                    })
                }
                activityLogger.info(resObj.user.username + " - reset password");
                EmailService.sendMail(emailObj);
                res.json({errorMessage: ""})
            } else {
                res.json({errorMessage: resObj.errorMessage})
            }
        }
    } else {
        res.json({ errorMessage:"The Link is invalid" })
    }
}

exports.verifyUserToken = function (req, res) {
    const token = req.body.token
    if(token) {
        JWT.verify(token, jwtSecret, function(error) {
            if(error) {
                res.json({errorMessage: "Token is invalid"})
            } else {
                res.json({errorMessage: ""})
            }
        })
    } else {
        res.json({errorMessage: "Token is undefined!"})
    }
}
