const mongoose = require('mongoose')

module.exports=mongoose.connect('mongodb+srv://hicircleconnect:MoGQb4T528xZo6RA@circlemongodbcluster.y38k0px.mongodb.net/circle?retryWrites=true&w=majority',()=>{
    console.log('connected')
})
