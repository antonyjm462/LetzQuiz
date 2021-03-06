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
const rankRef = db.collection('Rank');

// Instantiate the Dialogflow client.
const app = dialogflow({ debug: true, clientId: "695291363421-5046a2a6fe0objsco3hifnalrcnd34l9.apps.googleusercontent.com" });

//Initialization

let score = 0;

// let data = {
//     nickname: '',
//     grade: '',
//     score: 0,
//     timestamp: 0,
//     rank: 0
// };

let data = {};

let correct_response = ["You are absolutely correct", "Bravo, the answer is correct", "Perfect, Way to go", "Nice Work, thats right", "Great Work, you got it Right", "You Must be feeling Lucky today, thats Right", "Thats also right, Good Job", "Yes,Great Job", "the Judges say Yes, You got it", "I'll give it to you.Good Job", "You've been studing..Great job!", "Yes,thats right"];

let wrong_respose = ["Sorry Your answer is Wrong", "So sorry, the answer is not correct", "that answer is wrong", "Nope, thats not it", "Nope good, Try Though", "Answer is wrong,Better Luck next time", "You almost had it, but Wrong answer", "Good guess, But no Sorry", "Oh no, thats not the answer", "Well, no. Not Exactly", "Whoops.Sorry.That's Wrong"];

let rank = [];

let Questions = [];

let question_num = 0;

let max_question = 3;

let index = [];

let total_question_no = 20;

app.intent("Default Welcome Intent", (conv) => {
    conv.ask(new Permission({
        context: 'Hi there to get,to know you better',
        permissions: 'NAME'
    }));
});

//permission check 
app.intent('Permission_check', (conv, params, permissionGranted) => {
    if (!permissionGranted) {
        console.log(permissionGranted);
        console.log("permission not garented");
        const welcome_ssml = '<speak>' + `Ok, no worries.<break time="300ms" />You can Play as Guest,<prosody rate="medium">
                    <p>
                      <s>
                      Select The Grade to Play 
                      <break time="300ms" />
                      1,2,3
                      </s>
                    </p>
                  </prosody>` + '</speak>';
        conv.ask(welcome_ssml);
    } else {
        console.log(permissionGranted);
        conv.data.name = conv.user.name.display;
        return userRef.doc(conv.data.name).get()
            .then(doc => {
                conv.data.userId = doc.id;
                data = doc.data();
                getQuestion(data.grade);
                if (data !== undefined) {
                    const welcome_ssml = '<speak>' + `Thanks ${data.nickname.name},<prosody rate="medium">
                    <p>
                      <s>
                      Welcome Back to LetzQuiz!!
                      <break time="300ms" />
                      Let's Go on a Learning Journey,<break strength='weak' /> Shall We ? 
                      </s>
                    </p>
                  </prosody>` + '</speak>';
                    conv.ask(welcome_ssml);
                } else {
                    const login_ssml = '<speak>' + '<p>' + '<parsody rate="medium"> Welcome to LetzQuiz , <break time="300ms" /> Looks like you are a new User <break time="300ms" /> , Login first!</parsody>' + '</p>' + '</speak>';
                    conv.ask(login_ssml);
                }
            })
            .catch(err => {
                console.log('Error getting document', err);
            });
    }
});

//choose
app.intent('Choose_intent', (conv, { number }) => {
    getQuestion(number.toString());
    question_num = 0;
    const guest_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
    <s>You Are using Guest Account</s>
    <s><break time="400ms" />Sorry <break time="100ms" />Your Scores Will not be Saved</s> 
    </p> </prosody>` + '</speak>';
    conv.ask(guest_ssml);
    console.log("get question");
    const welcome_ssml = '<speak>' + `<prosody rate="medium">
                        <p>
                          <s>
                          Welcome to LetzQuiz!!
                          <break time="500ms" />
                          Let's Go on a Learning Journey,<break strength='weak' /> Shall We ? 
                          </s>
                        </p>
                      </prosody>` + '</speak>';
    conv.ask(welcome_ssml);
});

//Login 
app.intent('Login', (conv, { name, grade }) => {
    console.log("login intent");
    data = {
        nickname: name,
        grade: grade,
        score: 0,
        timestamp: new Date(),
        rank: 0
    };
    let setDoc = userRef.doc(conv.data.name).set(data);
    const newUser_ssml = '<speak>' + '<p>' + '<parsody rate="medium"><s> Your details are saved for future reference .</s> </parsody> <break time="300ms" /> <parsody rate="slow"><s> Here are some Tips :</s> <s> Every Question Has Four options , you can choose any one of it. </s> <break strength="weak" /> <s> If you didn"t hear Question properly you can always ask to repeat.</s> <break strength="weak" /> <s> Your rank will be calculated at end of the Quiz. try to Stay at the Top !!!</s><break strength="weak" /> <s> If you need help Just call Out "help"</s></parsody>' + '</p>' + '</speak>';
    conv.ask(newUser_ssml);
    const level_ssml = '<speak>' + `${data.nickname.name},<prosody rate="medium">
    <s>Welcome to LetzQuiz!!<break time="300ms" /> Let's Go on a Learning Journey,<break strength='weak' /> Shall We ? 
    </s></prosody>` + '</speak>';
    conv.ask(level_ssml);
});

//ask question
app.intent('Question-Ask', (conv) => {
    console.log("question ask");
    const answer_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
    <s> Remember the answer to questions are</s>
    <s> <break time="1s" /> a, b, c or d</s> 
    </p> </prosody>` + '</speak>';
    conv.ask(answer_ssml);
    if (question_num < max_question) {
        console.log("question no less inn ask");
        const question_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
            <s> ${Questions[question_num].question} </s>
            <s> <break time="1s" /> A. ${Questions[question_num].mcq.A} </s>
            <s> <break time="1s" /> B. ${Questions[question_num].mcq.B} </s>
            <s> <break time="1s" /> C. ${Questions[question_num].mcq.C} </s>
            <s> <break time="1s" /> D. ${Questions[question_num].mcq.D} </s> 
            </p> </prosody>` + '</speak>';
        conv.ask(question_ssml);
    }
    console.log("end question ask");
});

//Help
app.intent('Help', (conv, { param }, permissionGranted) => {
    const help_ssml = '<speak>' + '<p>' + '<parsody rate="slow"> <s> Here are some Tips :</s> <s> Every Question Has Four options , you can choose any one of it. </s> <break strength="weak" /> <s> If you didn"t hear Question properly you can always ask to repeat.</s> <break strength="weak" /> <s> Your rank will be calculated at end of the Quiz. try to Stay at the Top !!!</s><break strength="weak" /> <s> If you need help Just call Out "help"</s></parsody>' + '</p>' + '</speak>';
    conv.ask(help_ssml);
});


// answer question
app.intent('Question-Answer', (conv, { answer, repeat, permissionGranted }) => {
    console.log("question answer");
    answer = answer.toString().toLowerCase().trim();
    if (permissionGranted) {
        if ((Questions[question_num].correct).toString().toLowerCase().trim() == answer) {
            data.score += 4;
            score += 4;
            conv.ask(correct_response[question_num]);
        } else {
            data.score -= 2;
            score -= 2;
            conv.ask(wrong_respose[question_num]);
        }
    } else {
        if ((Questions[question_num].correct).toString().toLowerCase().trim() == answer) {
            score += 4;
            conv.ask(correct_response[question_num]);
        } else {
            score -= 2;
            conv.ask(wrong_respose[question_num]);
        }
    }
    question_num += 1;
    if (question_num < max_question) {
        if (question_num == max_question - 1) {
            const question_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
            <s> This is the last Question , Stay tooned <break strength="weak" /> ${Questions[question_num].question} </s>
            <s> <break time="1s" /> A. ${Questions[question_num].mcq.A} </s>
            <s> <break time="1s" /> B. ${Questions[question_num].mcq.B} </s>
            <s> <break time="1s" /> C. ${Questions[question_num].mcq.C} </s>
            <s> <break time="1s" /> D. ${Questions[question_num].mcq.D} </s> 
            </p> </prosody>` + '</speak>';
            conv.ask(question_ssml);
        } else {
            console.log("question ask" + index);
            console.log("question index" + question_num);
            const question_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
            <s> ${Questions[question_num].question} </s>
            <s> <break time="1s" /> A. ${Questions[question_num].mcq.A} </s>
            <s> <break time="1s" /> B. ${Questions[question_num].mcq.B} </s>
            <s> <break time="1s" /> C. ${Questions[question_num].mcq.C} </s>
            <s> <break time="1s" /> D. ${Questions[question_num].mcq.D} </s> 
            </p> </prosody>` + '</speak>';
            conv.ask(question_ssml);
        }
    } else {
        if (!permissionGranted) {
            let rank_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
            <s>  Your Score is ${score} </s>`;
            if (score > 0) {
                rank_ssml += '<s> <break time="200ms" /> Well done!! </s>';
            } else {
                rank_ssml += "<s> Don't worry, <break time='100ms' /> You can always try again ! </s>";
            }

            rank_ssml += `<s>Login next time to get Your Total Score</s> <s> Do you Want Know your rank?  </s> </p> </prosody>` +
                '</speak>';
            conv.ask(rank_ssml);
        } else {
            let setRank = rankRef.doc(conv.data.name).set({ score: data.score });
            getRank();
            let setDoc = userRef.doc(conv.data.name).set(data);
            let rank_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
            <s>  Your Score is ${score} </s>`;
            if (score > 0) {
                rank_ssml += '<s> <break time="200ms" /> Well done!! </s>';
            } else {
                rank_ssml += "<s> Don't worry, <break time='100ms' /> You can always try again ! </s>";
            }

            rank_ssml += `<s>Your Total Score ${data.score}.</s> <s> Want to Know your Rank ?  </s> </p> </prosody>` +
                '</speak>';
            conv.ask(rank_ssml);
        }
    }
    if (repeat.toString().toLowerCase() == "repeat") {
        console.log(Questions);
        if (question_num < max_question) {
            console.log("question ask" + index);
            console.log("question index" + question_num);
            const question_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
            <s> ${Questions[question_num].question} </s>
            <s> <break time="1s" /> A. ${Questions[question_num].mcq.A} </s>
            <s> <break time="1s" /> B. ${Questions[question_num].mcq.B} </s>
            <s> <break time="1s" /> C. ${Questions[question_num].mcq.C} </s>
            <s> <break time="1s" /> D. ${Questions[question_num].mcq.D} </s> 
            </p> </prosody>` + '</speak>';
            conv.ask(question_ssml);
        }
        console.log(conv.data);
    } else {
        const option_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
    <s>The Answers are</s>
    <s><break time="100ms" />a,b,c and d</s> 
    </p> </prosody>` + '</speak>';
        conv.ask(option_ssml);
    }
    console.log("Question answer");
});



//rank leader board
app.intent('Rank-intent', (conv, { param }, permissionGranted) => {
    if (!permissionGranted) {
        const guest_rank_ssml = '<speak>' + `<prosody rate="medium">
                        <p>
                          <s>
                          Sorry Rank can only be calculated if you have login
                          <break time="500ms" />
                          but,How did you Find the Quiz !!? 
                          </s>
                        </p>
                      </prosody>` + '</speak>';
        conv.ask(guest_rank_ssml);
    } else {
        console.log(rank);
        let ranklist_ssml = '<speak>' + '<prosody rate="medium"> <p> <s> Ranklist </s>';
        for (let i = 0; i < rank.length; i++) {
            if (i < 10) {
                ranklist_ssml += `<s>  ${ i + 1 } <break time="100ms" /> ${rank[i].userId} <break time="80ms" />  ${ rank[i].score } </s>`;
                console.log(ranklist_ssml);
            }
            if (rank[i].userId == conv.data.userId) {
                conv.ask(`Your rank is ${ i + 1 }`);
                const rank_got = true;
            }
            if ((i > 10) && (rank_got)) {
                break;
            }
        }
        ranklist_ssml += "<s> <break time='300ms' /> How did you Find the Quiz !! </s> </p> </prosody>" + '</speak>';
        conv.ask(ranklist_ssml);
    }
    question_num = 0;
});

app.intent('repeat-Quiz', (conv, { param }) => {
    const repeat_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
            <s>Thanks for Your Feed Back.</s>
            <s><break time="200ms" /> Do you Want to go Again?  </s> 
            </p> </prosody>` + '</speak>';
    conv.ask(repeat_ssml);
});


app.intent('Close-intent', (conv, { param }) => {
    conv.close("Bye Come again Soon!!!");
});

//without rank
app.intent('Question_Answer_no', (conv, { param }) => {
    const repeat_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
    <s>Thanks for Playing.</s>
    <s><break time="200ms" /> Do you Want to go Again?  </s> 
    </p> </prosody>` + '</speak>';
    conv.ask(repeat_ssml);
});

function getRandomInt(max) {
    let rand_array = [];
    let random = 0;
    for (let i = 0; i < max || rand_array.length != 10; i++) {
        random = Math.floor(Math.random() * Math.floor(max));
        random = random.toString();
        if (!(rand_array.includes(random))) {
            rand_array.push(random);
        }
    }
    return rand_array;
}

function getQuestion(grade) {
    let index = [];
    console.log("get Question");
    Questions = [];
    const gradeQuestionRef = db.collection('Questions:' + grade.toString());
    index = getRandomInt(total_question_no);
    console.log("inside get question" + index);
    for (let i = 0; i < index.length; i++) {
        let question = pickQuestion(index[i], gradeQuestionRef);
    }
    console.log("end get Question");
}

function pickQuestion(id, gradeQuestionRef) {
    return gradeQuestionRef.doc(id).get()
        .then(doc => {
            Questions.push(doc.data())
            console.log(doc.id, '=>', doc.data());
        })
        .catch(err => {
            console.log('Error getting document', err);
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

//Export fulfillment
exports.fulfillment = functions.https.onRequest(app);