const adminAuth=(req,res,next)=>{
    console.log(" Admin authentication chacking...");
    const token="Admintoken";
    const isAdminAuthorized= token === "Admintoken";
    if(!isAdminAuthorized){
        res.status(401).send("unauthorized request")
    }else{
        next();
    }
};
const userAuth=(req,res,next)=>{
    console.log(" User authentication chacking...");
    const token="Usertoken";
    const isUserAuthorized= token === "Usertoken";
    if(!isUserAuthorized){
        res.status(401).send("unauthorized request")
    }else{
        next();
    }
};

module.exports={
    adminAuth,
    userAuth
}