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

const correct_response = ["You are absolutely correct", "Bravo, the answer is correct", "Perfect, Way to go", "Thats right, Nice Work", "Great Work, you got it Right", "You Must be feeling Lucky today, thats Right", "Thats also right, Good Job", "Yes,Great Job", "the Judges say Yes, You got it", "I'll give it to you.Good Job", "You've been studing..Great job!", "Yes,thats right"];

const wrong_respose = ["Sorry Your answer is Wrong", "So sorry, the answer is not correct", "Nope, thats not it", "Nope ,Good Try Though", "Answer is wrong,Better Luck next time", "You almost had it, but Wrong answer", "Good guess, But no Sorry", "Oh no, thats not the answer", "Well, no. Not Exactly", "Whoops.Sorry.That's Wrong"];

const welcome_response = ["Missed you Already", "Didn't see you Yesterday", "It has been a while"]

const REPEAT_PREFIX = [
    'Sorry, I said ',
    'Let me repeat that. ',
];

let rank = [];

let Questions = [];

const max_question = 5;

const total_question_no = 20;

//Welcome intent
app.intent("Default Welcome Intent", (conv) => {
    conv.data.is_guest = false;
    conv.data.question_num = 0;
    conv.data.welcome_response = welcome_response[secBetweenDate(conv.user.last.seen)];
    conv.ask(new Permission({
        context: 'Hi there, To Login',
        permissions: 'NAME'
    }));
});

//permission check 
app.intent('Permission_check', (conv, params, permissionGranted) => {
    if (!permissionGranted) {
        conv.data.is_guest = true;
        console.log("permission not garented");
        const welcome_ssml = '<speak>' + `Ok, no worries.<break time="300ms" />You can Play as Guest,<prosody rate="medium">
                    <p>
                      <s>
                      Select The Grade to Play, <break time="300ms" /> 1, 2 or 3
                      </s>
                    </p>
                  </prosody>` + '</speak>';
        conv.ask(welcome_ssml);
    } else {
        conv.data.name = conv.user.name.display;
        return userRef.doc(conv.data.name).get()
            .then(doc => {
                if (doc.exists) {
                    conv.data.Userdata = doc.data();
                    Questions = getQuestion(conv.data.Userdata.grade);
                    conv.data.Questions = Questions;
                    const welcome_ssml = '<speak>' + `<prosody rate="medium">
                    <p>
                      <s>Hai ${conv.data.Userdata.nickname.name},</s>
                      <s> Welcome Back to LetzQuiz , ${conv.data.welcome_response} </s>
                      <s><break time="300ms" />Shall We Start?</s>
                    </p>
                  </prosody>` + '</speak>';
                    conv.ask(welcome_ssml);
                } else {
                    console.log("doc not exist");
                    const login_ssml = '<speak>' + `<prosody rate="medium">
                    <p>
                      <s> Hmm...<break time="300ms" /> </s>
                      <s>Looks like you are a new User<break strength='weak' /> Login First ! </s>
                    </p>
                  </prosody>` + '</speak>';
                    conv.ask(login_ssml);
                }
            }).catch(function(error) {
                console.log("Error getting document:", error);
                const error_ssml = '<speak>' + '<p>' + '<parsody rate="medium"> oops somthing went wrong! try again later </parsody>' + '</p>' + '</speak>';
                conv.ask(error_ssml);
            });
    }
});

//choose
app.intent('Choose_intent', (conv, { number }) => {
    Questions = getQuestion(number.toString());
    const guest_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
    <s>You Are using Guest Account</s>
    <s><break time="400ms" />Sorry <break time="100ms" />Your Scores Will not be Saved</s> 
    </p> </prosody>` + '</speak>';
    conv.ask(guest_ssml);
    console.log("get question");
    const welcome_ssml = '<speak>' + `<prosody rate="medium">
                        <p>
                          <s> Welcome to LetzQuiz ${conv.data.welcome_response} <break time="500ms" /> </s>
                          <s><break time="300ms" />Shall We Start?</s>
                        </p>
                      </prosody>` + '</speak>';
    conv.ask(welcome_ssml);
});

//Login 
app.intent('Login', (conv, { name, grade }) => {
    console.log("login intent");
    conv.data.Userdata = {
        nickname: name,
        grade: grade.toString(),
        score: 0,
        timestamp: new Date(),
    };
    const newUser_ssml = '<speak>' + '<p>' +
        `<s> Your details are saved for future reference .</s>
        <s> Here are some Tips :</s>
        <s> Every Question Has Four options , you can choose any one of it. </s>
        <s> If you didn"t hear Question properly you can always ask to repeat.</s> 
        <s> Your rank will be calculated at end of the Quiz. try to Stay at the Top !!!</s>
        <s> If you need help Just call Out</s>` + '</p>' + '</speak>';
    conv.ask(newUser_ssml);
    const welcome_ssml = '<speak>' + `<prosody rate="medium">
                    <p>
                      <s>Hai ${conv.data.Userdata.nickname.name},</s>
                      <s> Welcome to LetzQuiz</s>
                      <s><break time="300ms" />Shall We Start?</s>
                    </p>
                  </prosody>` + '</speak>';
    conv.ask(welcome_ssml);
    let userREF = userRef.doc(conv.data.name).set(conv.data.Userdata);
    Questions = getQuestion(conv.data.Userdata.grade);
});

//ask question
app.intent('Question-Ask', (conv) => {
    console.log("data", conv.data.Questions);
    const answer_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
    <s> Remember the answer to questions are</s>
    <s> <break time="1s" /> a, b, c or d</s> 
    </p> </prosody>` + '</speak>';
    conv.ask(answer_ssml);
    if (Questions.length == 0) {
        const error_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
        <s> Oops Somthing Went Wrong </s>
        <s> <break time="1s" />Wait for Some time, We will back soon</s> 
        </p> </prosody>` + '</speak>';
        conv.ask(error_ssml);
    }
    if (conv.data.question_num < max_question) {
        const question_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
            <s> ${Questions[conv.data.question_num].question} </s>
            <s> <break time="1s" /> A. ${Questions[conv.data.question_num].mcq.A} </s>
            <s> <break time="1s" /> B. ${Questions[conv.data.question_num].mcq.B} </s>
            <s> <break time="1s" /> C. ${Questions[conv.data.question_num].mcq.C} </s>
            <s> <break time="1s" /> D. ${Questions[conv.data.question_num].mcq.D} </s> 
            </p> </prosody>` + '</speak>';
        conv.ask(question_ssml);
    }
});

// answer question
app.intent('Question-Answer', (conv, { answer, repeat }) => {
    answer = answer.toString().toLowerCase().trim();
    if ((Questions[conv.data.question_num].correct).toString().toLowerCase().trim() == answer) {
        conv.data.score += 4;
        conv.ask(correct_response[conv.data.question_num]);
    } else {
        conv.data.score -= 2;
        conv.ask(wrong_respose[conv.data.question_num]);
    }
    conv.data.question_num += 1;
    if (conv.data.question_num < max_question) {
        if (conv.data.question_num == max_question - 1) {
            const question_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
            <s> This is the last Question , Stay tooned <break strength="weak" /> ${Questions[conv.data.question_num].question} </s>
            <s> <break time="1s" /> A. ${Questions[conv.data.question_num].mcq.A} </s>
            <s> <break time="1s" /> B. ${Questions[conv.data.question_num].mcq.B} </s>
            <s> <break time="1s" /> C. ${Questions[conv.data.question_num].mcq.C} </s>
            <s> <break time="1s" /> D. ${Questions[conv.data.question_num].mcq.D} </s> 
            </p> </prosody>` + '</speak>';
            conv.ask(question_ssml);
        } else {
            const question_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
            <s> ${Questions[conv.data.question_num].question} </s>
            <s> <break time="1s" /> A. ${Questions[conv.data.question_num].mcq.A} </s>
            <s> <break time="1s" /> B. ${Questions[conv.data.question_num].mcq.B} </s>
            <s> <break time="1s" /> C. ${Questions[conv.data.question_num].mcq.C} </s>
            <s> <break time="1s" /> D. ${Questions[conv.data.question_num].mcq.D} </s> 
            </p> </prosody>` + '</speak>';
            conv.ask(question_ssml);
        }
    } else {
        if (conv.data.is_guest) {
            let rank_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
            <s>  Your Score is ${conv.data.score} </s>`;
            if (conv.data.score > 0) {
                rank_ssml += '<s> <break time="200ms" /> Well done!! </s>';
            } else {
                rank_ssml += "<s> Don't worry, <break time='100ms' /> You can always try again ! </s>";
            }

            rank_ssml += `<s>Login next time to get Your Total Score</s> <s> Do you Want Know your rank?  </s> </p> </prosody>` +
                '</speak>';
            conv.ask(rank_ssml);
        } else {
            conv.data.Userdata.score += conv.data.score;
            let setRank = rankRef.doc(conv.data.name).set({ score: conv.data.Userdata.score });
            let setDoc = userRef.doc(conv.data.name).set(conv.data.Userdata);
            getRank();
            let rank_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
            <s> ${conv.data.Userdata.nickname.name} Your Score is ${conv.data.score},</s>`;
            if (conv.data.score > 0) {
                rank_ssml += '<s> <break time="200ms" /> Well done!! </s>';
            } else {
                rank_ssml += "<s> Don't worry, <break time='100ms' /> You can always try again ! </s>";
            }

            rank_ssml += `<s>Your Total Score ${conv.data.Userdata.score}.</s> <s> Want to Know your Rank ?  </s> </p> </prosody>` +
                '</speak>';
            conv.ask(rank_ssml);
        }
    }
    if (repeat != undefined) {
        if (conv.data.question_num < max_question) {
            const question_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
            <s> ${Questions[conv.data.question_num].question} </s>
            <s> <break time="1s" /> A. ${Questions[conv.data.question_num].mcq.A} </s>
            <s> <break time="1s" /> B. ${Questions[conv.data.question_num].mcq.B} </s>
            <s> <break time="1s" /> C. ${Questions[conv.data.question_num].mcq.C} </s>
            <s> <break time="1s" /> D. ${Questions[conv.data.question_num].mcq.D} </s> 
            </p> </prosody>` + '</speak>';
            conv.ask(question_ssml);
        }
    }
});



//rank leader board
app.intent('Rank-intent', (conv) => {
    if (conv.data.is_guest) {
        const guest_rank_ssml = '<speak>' + `<prosody rate="medium">
                        <p>
                          <s>
                          Sorry Rank can only be calculated if you have logined
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
                ranklist_ssml += `<s>  ${ i + 1 } <break time="100ms" /> ${rank[i].userId} </s>`;
                console.log(ranklist_ssml);
            }
            if (rank[i].userId == conv.data.name) {
                conv.ask(`Your rank is ${ i + 1 }`);
                const rank_got = true;
            }
            if ((i > 10) && (rank_got)) {
                break;
            }
        }
        ranklist_ssml += `<s> <break time='300ms' /> ${conv.data.Userdata.nickname.name} How did you Find the Quiz !! </s> </p> </prosody>` + '</speak>';
        conv.ask(ranklist_ssml);
    }
    conv.data.question_num = 0;
});

app.intent('repeat-Quiz', (conv, { param }) => {
    const repeat_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
            <s>Thanks for Your Feed Back,${conv.data.Userdata.nickname.name}</s>
            <s><break time="200ms" /> Do you Want to go Again?  </s> 
            </p> </prosody>` + '</speak>';
    conv.ask(repeat_ssml);
    Questions = getQuestion(conv.data.Userdata.grade);
    conv.data.score = 0;
    conv.data.question_num = 0;
});

//close intent
app.intent('Close-intent', (conv, { param }) => {
    const close_ssml = '<speak>' + '<parsody rate="medium"> ' + `<p>
    <s>Bye ${conv.data.Userdata.nickname.name}, Come Again Soon </s> 
    </p>` + '</parsody>' + '</speak>';
    conv.ask(close_ssml);
});

//Help
app.intent('Help', (conv, { param }) => {
    const help_ssml = '<speak>' + '<parsody rate="slow"> ' + `<p>
    <s> Here are some Tips :</s> 
    <s> Every Question Has Four options A,B,C,D you can choose any one of it. </s>
    <s> If you didn"t hear Question properly you can always ask to repeat.</s> 
    <s> Your rank will be calculated at end of the Quiz. try to Stay at the Top !!!</s>
    <s> If you need help Just call Out "help"</s>
    </p>` + '</parsody>' + '</speak>';
    conv.ask(help_ssml);
});

//without rank
app.intent('Question_Answer_no', (conv, { param }) => {
    const repeat_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
    <s>Thanks for Playing.</s>
    <s><break time="200ms" /> Do you Want to go Again?  </s> 
    </p> </prosody>` + '</speak>';
    conv.ask(repeat_ssml);
});

app.intent('repeat', (conv) => {
    let repeatPrefix = promptFetch.getRepeatPrefix(); // randomly chooses from REPEAT_PREFIX
    // Move SSML start tags over
    if (conv.data.lastPrompt.startsWith(promptFetch.getSSMLPrefix())) {
        conv.data.lastPrompt = conv.data.lastPrompt.slice(promptFetch.getSSMLPrefix, length);
        repeatPrefix = promptFetch.getSSMLPrefix() + repeatPrefix;
    }
    conv.ask(repeatPrefix + conv.data.lastPrompt,
        conv.data.lastNoInputPrompts);
});

function getRandArray(max) {
    let rand_array = [];
    for (let i = 0; rand_array.length != 5; i++) {
        let random = Math.floor(Math.random() * Math.floor(max)).toString();
        if (!(rand_array.includes(random))) {
            rand_array.push(random);
        }
    }
    return rand_array;
}

function getQuestion(grade) {
    let questions = [];
    let randArray = getRandArray(total_question_no);
    console.log(randArray);
    const gradeQuestionRef = db.collection("Questions:" + grade.toString().trim());
    let questionREF = gradeQuestionRef.where('num', 'in', randArray).get()
        .then(function(querySnapshot) {
            console.log("doc came");
            querySnapshot.forEach(function(doc) {
                questions.push(doc.data())
            });
        })
        .catch(function(error) {
            console.log("Error getting documents: ", error);
        });
    return questions
}

function secBetweenDate(date) {
    let t1 = new Date(date);
    let t2 = new Date();
    let diff = t2.getTime() - t1.getTime();
    let day = Math.round(diff / 86400000);
    if (day <= 1) {
        return day
    } else {
        return 2
    }
}

function getRank() {
    rank = [];
    return rankRef.orderBy("score", 'desc').get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                rank.push({ userId: doc.id, score: doc.data().score });
            });
        })
        .catch(err => {
            console.log('Error getting documents', err);
        });
}

//Export fulfillment
exports.fulfillment = functions.https.onRequest(app);