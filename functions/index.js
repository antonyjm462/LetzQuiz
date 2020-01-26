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
const questionRef = ;
const rankRef = db.collection('Rank');

// Instantiate the Dialogflow client.
const app = dialogflow({ debug: true, clientId: "695291363421-5046a2a6fe0objsco3hifnalrcnd34l9.apps.googleusercontent.com" });

//Initialization

let username = ''

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
    score: ""
};

let rank = [];

let Questions = [];

let question_num = 0;

let max_question = 1;

let question_start = [];


//Welcome intent
app.intent("Default Welcome Intent", (conv) => {
    conv.ask(new Permission({
        context: 'Hi there to get,to know you better',
        permissions: 'NAME'
    }));
});

//permission check 
app.intent('Permission_check', (conv, params, permissionGranted) => {
    if (!permissionGranted) {
        const guest_ssml = '<speak>' + '<p>' + '<parsody rate="medium"> Ok, no worries.<break time="300ms" /> Play the guest Version?</parsody>' + '</p>' + '</speak>';
        conv.ask(guest_ssml);
    } else {
        conv.data.name = conv.user.name.display;
        username = conv.data.name;
        const welcome_ssml = '<speak>' +
            `Thanks ${conv.data.name} <break strength="medium"/>.` +
            'Welcome to LetzQuiz' +
            '</speak>';
        conv.ask(welcome_ssml);
        return userRef.doc(conv.data.name).get()
            .then(doc => {
                userId = doc.id;
                data = doc.data();
                if (data !== undefined) {
                    const level_ssml = '<speak>' + `${data.nickname},<prosody rate="medium">
                    <p>
                      <s>
                      Select the Level to Start Quiz
                      </s>
                      <s>1 <break time="500ms" /> </s>
                      <s>2 <break time="500ms" /> </s>
                      <s>3 <break time="500ms" /> </s>
                    </p>
                  </prosody>` + '</speak>';
                    conv.ask(level_ssml);
                } else {
                    const login_ssml = '<speak>' + '<p>' + '<parsody rate="medium"> Looks like you are a new User <break time="300ms" /> , Login first!</parsody>' + '</p>' + '</speak>';
                    conv.ask(login_ssml);
                }
            })
            .catch(err => {
                console.log('Error getting document', err);
            });
    }
});

//Login 
app.intent('Login', (conv, { name, email, grade }) => {
    console.log("login intent");
    data = {
        nickname: name,
        email: email,
        grade: grade,
        score: 0,
        timestamp: new Date(),
        rank: 0
    };
    let setDoc = userRef.doc(conv.data.name).set(data);
    const newUser_ssml = '<speak>' + '<p>' + '<parsody rate="medium"><s> Your details are saved for future reference .</s> </parsody> <break time="300ms" /> <parsody rate="slow"><s> Here are some Tips :</s> <s> Every Question Has Four options , you can choose any one of it. </s> <break strength="weak" /> <s> If you didn"t hear Question properly you can always ask to repeat.</s> <break strength="weak" /> <s> Your rank will be calculated at end of the Quiz. try to Stay at the Top !!!</s><break strength="weak" /> <s> If you need help Just call Out "help"</s></parsody>' + '</p>' + '</speak>';
    conv.ask(newUser_ssml);
    const level_ssml = '<speak>' + `${data.nickname},<prosody rate="medium">
                    <p>
                      <s>
                      Select the Level to Start Quiz
                      </s>
                      <s>1 <break time="500ms" /> </s>
                      <s>2 <break time="500ms" /> </s>
                      <s>3 <break time="500ms" /> </s>
                    </p>
                  </prosody>` + '</speak>';
    conv.ask(level_ssml);
});

//set difficulty level
app.intent('Set_difficulty', (conv, { level }) => {
    console.log("difficulty");
    if (level == 1) {
        max_question = 5;
    } else if (level == 2) {
        max_question = 10;
    } else if (level == 3) {
        max_question = 15;
    }
    getQuestion(data.grade);
    conv.ask("Are you ready to Start the Quiz");
    question_num = 1;
});

//ask question
app.intent('Question-Ask', (conv) => {
    console.log(Questions);
    if (question_num <= max_question) {
        let index = getRandomInt(Questions.length);
        const question_ssml = '<speak>' + `<p> <emphasis level="moderate">
            <s> <prosody rate="medium"> ${Questions[index].question} </prosody> </s>
            <prosody rate="slow"> <s> <break time="1s" /> 1) ${Questions[index].mcq.A}\n </s>
            <s> <break time="1s" /> 2) ${Questions[index].mcq.B}\n</s>
            <s> <break time="1s" /> 3) ${Questions[index].mcq.C}\n</s>
            <s> <break time="1s" /> 4) ${Questions[index].mcq.D}\n</s> </prosody> </emphasis>
            </p>` + '</speak>';
        conv.ask(question_ssml);
    }
    console.log(conv.data);
});

//Help
app.intent('Help', (conv, { param }) => {
    const help_ssml = '<speak>' + '<p>' + '<parsody rate="slow"> <s> Here are some Tips :</s> <s> Every Question Has Four options , you can choose any one of it. </s> <break strength="weak" /> <s> If you didn"t hear Question properly you can always ask to repeat.</s> <break strength="weak" /> <s> Your rank will be calculated at end of the Quiz. try to Stay at the Top !!!</s><break strength="weak" /> <s> If you need help Just call Out "help"</s></parsody>' + '</p>' + '</speak>';
    conv.ask(" say Login for login\n, repeat for repeating the question etc");
});


// answer question
app.intent('Question-Answer', (conv, { answer, repeat }) => {
    console.log("question anser");
    answer = answer.toString().toLowerCase();
    if (answer in [a, b, c, d]) {
        if ((Questions[index].correct).toString().toLowerCase() == answer) {
            data.score += 4;
            conv.ask("You Are Absolutely Correct");
        } else {
            data.score -= 2;
            conv.ask("Sorry Your answer is Wrong");
        }
        question_num += 1;
        let index = getRandomInt(Questions.length);
        if (question_num <= max_question) {
            if (question_num == max_question) {
                const question_ssml = '<speak>' + `<p> <emphasis level="moderate"> this is the last Question
                <s> <prosody rate="medium"> <break time="1s" /> ${Questions[index].question}</prosody> </s>
                <prosody rate="slow"> <s> 1) ${Questions[index].mcq.A}\n </s>
                <s> <break time="1s" /> 2) ${Questions[index].mcq.B}\n</s>
                <s> <break time="1s" /> 3) ${Questions[index].mcq.C}\n</s>
                <s> <break time="1s" /> 4) ${Questions[index].mcq.D}\n</s> </prosody> </emphasis>
                </p>` + '</speak>';
                conv.ask(question_ssml);
            } else {
                const question_ssml = '<speak>' + `<p> <emphasis level="moderate">
                <s> <prosody rate="medium"> <break time="1s" /> ${Questions[index].question}</prosody> </s>
                <prosody rate="slow"> <s> <break time="1s" /> 1) ${Questions[index].mcq.A}\n </s>
                <s> <break time="1s" /> 2) ${Questions[index].mcq.B}\n</s>
                <s> <break time="1s" /> 3) ${Questions[index].mcq.C}\n</s>
                <s> <break time="1s" /> 4) ${Questions[index].mcq.D}\n</s> </prosody> </emphasis>
                </p>` + '</speak>';
                conv.ask(question_ssml);
            }
        } else {
            conv.ask(`Your Score is Total Score is ${data.score}, Want to Know your rank ?`);
            let setRank = rankRef.doc(username).set({ score: data.score });
            let setDoc = userRef.doc(username).set(data);
            console.log("score set");
            getRank();
            console.log(rank);
        }
    } else {
        console.log(repeat);
        if (repeat.toString().toLowerCase() == "repeat") {
            console.log(Questions);
            if (question_num <= max_question) {
                const question_ssml = '<speak>' + `<p> <emphasis level="moderate">
            <s> <prosody rate="medium"> ${Questions[index].question} </prosody> </s>
            <prosody rate="slow"> <s> <break time="1s" /> 1) ${Questions[index].mcq.A}\n </s>
            <s> <break time="1s" /> 2) ${Questions[index].mcq.B}\n</s>
            <s> <break time="1s" /> 3) ${Questions[index].mcq.C}\n</s>
            <s> <break time="1s" /> 4) ${Questions[index].mcq.D}\n</s> </prosody> </emphasis>
            </p>` + '</speak>';
                conv.ask(question_ssml);
            }
            console.log(conv.data);
        }
    }
});



//rank leader board
app.intent('Hour-Rank', (conv) => {
    console.log("rank function");
    let ranklist = "Rank List \n\n";
    for (let i = 0; i < rank.length; i++) {
        if (i < 10) {
            ranklist += `${ i + 1 }. ${rank[i].userId} ${rank[i].score} \n`;
            console.log(ranklist);
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

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function getQuestion(grade) {
    Questions = [];
    return db.collection('Questions:' + grade.toString()).get()
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
    rank = [];
    console.log("rank function");
    return rankRef.orderBy("score", 'desc').get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log('No matching documents.');
                return;
            }

            snapshot.forEach(doc => {
                rank.push({ userId: doc.id, score: doc.data().score });
                console.log(doc.id, '=>', doc.data());
            });
        })
        .catch(err => {
            console.log('Error getting documents', err);
        });
}

//Score board
// app.intent('Score', (conv, { param }) => {
//     conv.ask(`Your Score is ${data.score}`);
//     let setDoc = userRef.doc(username).set(data);
//     let setRank = rankRef.doc(data.nickname).set({ score: data.score });
//     getRank();
// });



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


//Export fulfillment
exports.fulfillment = functions.https.onRequest(app);