'use strict';

// Import the Dialogflow module from the Actions on Google client library.
const {
    dialogflow,
    SimpleResponse,
    Permission,
    Suggestions,
    SignIn,
} = require('actions-on-google');

// Import the firebase-functions package for deployment.
const functions = require('firebase-functions');

const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

//refrences
const db = admin.firestore();
const userRef = db.collection('User');
const questionRef = db.collection('Questions');
const rankRef = db.collection('Rank');

// Instantiate the Dialogflow client.
const app = dialogflow({ debug: true, clientId: "695291363421-5046a2a6fe0objsco3hifnalrcnd34l9.apps.googleusercontent.com" });

//Initialization
let data = {
    nickname: '',
    email: '',
    grade: '',
    score: '',
    timestamp: '',
    rank: ''
};

let userRank = {
    userId: "",
    Score: ""
};

let rank = [];

let Questions = [];

let question_num = 0;

let max_question = 20;



//Capture intent
app.intent("Default Welcome Intent", (conv) => {
    conv.ask(new Permission({
        context: 'Welcome to Letz Quiz! , Hi there, to get to know you better',
        permissions: 'NAME'
    }));
    // conv.ask("Welcome to Letz Quiz! Let's Embark a wonderful journey of knowledge");
});

// // Intent that starts the account linking flow.
// app.intent('Start Signin', (conv) => {
//     conv.ask(new SignIn('To get your account details'));
// });

// //intent for permission
// app.intent('Ask Permission', (conv) => {
//     conv.ask(new Permission({
//         context: 'Hi there, to get to know you better',
//         permissions: 'NAME'
//     }));
// });

//permission check 
app.intent('Permission_check', (conv, params, permissionGranted) => {
    if (!permissionGranted) {
        conv.ask(`Ok, no worries. Play the guest Version?`);
    } else {
        conv.data.name = conv.user.name.display;
        conv.ask(`Thanks, ${conv.data.name}`);
        return userRef.doc(conv.data.name).get()
            .then(doc => {
                data = doc.data();
                if (data !== undefined) {
                    conv.ask(`${data.nickname.name}, Select the Level to Start Quiz (1,2,3)?`);
                } else {
                    conv.ask("Looks like you are a new user, Login first!");
                }
            })
            .catch(err => {
                console.log('Error getting document', err);
            });
    }
});

app.intent('Login', (conv, { name, email, grade }) => {
    data = {
        nickname: name,
        email: email,
        grade: grade,
        score: 0,
        timestamp: Date.now(),
        rank: 0
    };
    let setDoc = userRef.doc(conv.data.name).set(data);
    conv.ask("Your details are saved for future reference");
    conv.ask(`${data.nickname.name}, Select the Level to Start Quiz (1,2,3)?`);
});

//set difficulty level
app.intent('Set_difficulty', (conv, { level }) => {
    if (level == 1) {
        max_question = 20;
    } else if (level == 2) {
        max_question = 40;
    } else {
        max_question = 60;
    }
    console.log("grade function invoked");
    getQuestion(data.grade);
    conv.ask("Are you ready to Start the Quiz");
});

//ask question
app.intent('Question-Ask', (conv) => {
    if (question_num <= max_question) {
        conv.ask(`Question ${question_num+1} ${Questions[question_num].question} , the options  : 
         ${Questions[question_num].mcq.A},  ${Questions[question_num].mcq.B},   ${Questions[question_num].mcq.C},   ${Questions[question_num].mcq.D}`);
    }
});

// answer question
app.intent('Question-Answer', (conv, { answer }) => {
    console.log((Questions[question_num].correct).toString().toLowerCase());
    console.log(answer.toString().toLowerCase());
    if ((Questions[question_num].correct).toString().toLowerCase() === (answer.toString().toLowerCase())) {
        data.score += 4;
        conv.ask("You Are Absolutely Correct");
    } else {
        data.score -= 2;
        conv.ask(`Sorry Your answer is Wrong, the Correct answer is ${Questions[question_num].correct}`);
    }
    question_num += 1;
    console.log(question_num);
});

//Score board
app.intent('Score', (conv, { param }) => {
    conv.ask(`Your Score is ${data.score}`);
    let setDoc = userRef.doc(conv.data.name).set(data);
    let setRank = rankRef.doc(conv.data.name).set({ score: data.score });
});


//rank leader board
app.intent('Hour-Rank', (conv, { param }) => {
    getRank();


});



// // Checks User 
// app.intent('Get Signin', (conv, params, signin) => {
//     if (signin.status === 'OK') {
//         const payload = conv.user.profile.payload;
//         conv.ask(new SimpleResponse({
//             speech: `I got your account details, ${payload.name}. What do you want to do next?`,
//             text: `I got your account details, ${payload.name}. What do you want to do next?`
//         }));
//         checkUser(payload.email);
//     } else {
//         conv.ask(new SimpleResponse({
//             speech: "I won't be able to save your data, but try signin up?",
//             text: "I won't be able to save your data, but what do you want to do next?"
//         }));
//     }
// });

function getQuestion(grade) {
    console.log("question function :" + Number(grade));
    return questionRef.where('grade', '==', 1).get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log('No matching documents.');
                return;
            }

            snapshot.forEach(doc => {
                Questions.push(doc.data())
                console.log(doc.id, '=>', doc.data());
            });
        })
        .catch(err => {
            console.log('Error getting documents', err);
        });
    question_num = 0;
}


function getRank() {
    console.log();
    return rankRef.where('grade', '==', 1).get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log('No matching documents.');
                return;
            }

            snapshot.forEach(doc => {
                userRank.userId = doc.id;
                userRank.rank = doc.data().score;
                rank.push(userRank);
                console.log(doc.id, '=>', doc.data());
            });
        })
        .catch(err => {
            console.log('Error getting documents', err);
        });
}

//Export fulfillment
exports.fulfillment = functions.https.onRequest(app);