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

let userId = "";

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
                userId = doc.id;
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
        timestamp: new Date(),
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
    question_num = 0;
});

//ask question
app.intent('Question-Ask', (conv) => {
    console.log(question_num);
    if (question_num <= max_question) {
        conv.ask(`Question ${question_num+1} ${Questions[question_num].question} , the options  : 
        1) ${Questions[question_num].mcq.A}
        2) ${Questions[question_num].mcq.B}
        3) ${Questions[question_num].mcq.C}
        4) ${Questions[question_num].mcq.D}`);
    }
});

// answer question
app.intent('Question-Answer', (conv, { answer }) => {
    console.log((Questions[question_num].correct).toString());
    console.log(answer.toString());
    if ((Questions[question_num].correct).toString() == answer.toString()) {
        data.score += 4;
        conv.ask("You Are Absolutely Correct");
    } else {
        data.score -= 2;
        conv.ask("Sorry Your answer is Wrong");
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
app.intent('Hour-Rank', (conv) => {
    console.log("hour rank intent");
    getRank();
    console.log("rank");
    rank.sort(function(a, b) {
        return a.score - b.score
    });
    console.log("sorting problem");
    ranklist = "";
    for (let i = 0; i < rank.length(); i++) {
        if (i < 10) {
            ranklist += `${ i + 1 }. ${rank[i].userId} ${rank[i].score}`;
        }
        if (rank[i].userId == userId) {
            conv.ask(`your rank is ${ i + 1 }`);
            const rank_got = true;
        }
        if ((i > 10) && (rank_got)) {
            break;
        }
    }
    conv.ask(ranklist);
});



// Checks User 
// app.intent('Get Signin', (conv, params, signin) => {
//     if (signin.status === 'OK') {
//         const payload = conv.user.profile.payload;
//         conv.ask(new SimpleResponse({
//             speech: `
// I got your account details, $ { payload.name }.What do you want to do next ? `,
//             text: `
// I
// got your account details, $ { payload.name }.What do you want to do next ? `
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
    console.log("question function :" + grade);
    return questionRef.where('grade', '==', grade.toString()).get()
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
}


function getRank() {
    console.log("rank function");
    return rankRef.get()
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