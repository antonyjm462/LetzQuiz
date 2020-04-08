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

let rank = [];

let Questions = [];

const max_question = 5;

const total_question_no = 8;

//Welcome intent
app.intent("Default Welcome Intent", (conv) => {
    conv.data.is_guest = false;
    conv.data.question_num = 0;
    conv.ask(new Permission({
        context: 'Hi there to get,to know you better',
        permissions: 'NAME'
    }));
});

//permission check 
app.intent('Permission_check', (conv, params, permissionGranted) => {
    console.log(conv.user.last.seen);
    console.log("inside permission check", permissionGranted);
    if (!permissionGranted) {
        conv.data.is_guest = true;
        console.log("permission not garented");
        const welcome_ssml = '<speak>' + `Ok, no worries.<break time="300ms" />You can Play as Guest,<prosody rate="medium">
                    <p>
                      <s>
                      Select The Grade to Play ,from 1 <break time="300ms" />to 5
                      </s>
                    </p>
                  </prosody>` + '</speak>';
        conv.ask(welcome_ssml);
    } else {
        conv.data.name = conv.user.name.display;
        return userRef.doc(conv.data.name).get()
            .then(function(doc) {
                if (doc.exists) {
                    conv.data.Userdata = doc.data();
                    let qes = getQuestion(conv.data.Userdata.grade);
                    conv.data.userId = doc.id;
                    const welcome_ssml = '<speak>' + `Thanks ${conv.data.Userdata.nickname.name},<prosody rate="medium">
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
                    console.log("doc not exist");
                    const login_ssml = '<speak>' + `<prosody rate="medium">
                    <p>
                      <s>
                      Hmm...
                      <break time="300ms" />
                      Looks like you are a new User<break strength='weak' /> Login First ! 
                      </s>
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
    let qes = getQuestion(number.toString());
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
    const level_ssml = '<speak>' + `${conv.data.Userdata.nickname.name},<prosody rate="medium">
    <s>Welcome to LetzQuiz!!<break time="300ms" /> Let's Go on a Learning Journey,<break strength='weak' /> Shall We ? 
    </s></prosody>` + '</speak>';
    conv.ask(level_ssml);
    let userREF = userRef.doc(conv.data.name).set(conv.data.Userdata);
    let qes = getQuestion(conv.data.Userdata.grade);
});

//ask question
app.intent('Question-Ask', (conv) => {
    const answer_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
    <s> Remember the answer to questions are</s>
    <s> <break time="1s" /> a, b, c or d</s> 
    </p> </prosody>` + '</speak>';
    conv.ask(answer_ssml);
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
            <s>  Your Score is ${conv.data.score} </s>`;
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
        console.log(conv.data);
    }
    // else {
    //     const option_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
    //     <s> Remember the answer to questions are</s>
    //     <s> <break time="1s" /> a, b, c or d</s> 
    //     </p> </prosody>` + '</speak>';
    //     conv.ask(option_ssml);
    // }
    console.log(conv.data.question_num);
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
    conv.data.question_num = 0;
});

app.intent('repeat-Quiz', (conv, { param }) => {
    const repeat_ssml = '<speak>' + ` <prosody rate="medium"> <p> 
            <s>Thanks for Your Feed Back.</s>
            <s><break time="200ms" /> Do you Want to go Again?  </s> 
            </p> </prosody>` + '</speak>';
    conv.ask(repeat_ssml);
    let qes = getQuestion(conv.data.Userdata.grade);
    conv.data.score = 0;
    conv.data.question_num = 0;
    Questions = []
});

//close intent
app.intent('Close-intent', (conv, { param }) => {
    conv.close("Bye Come again Soon!!!");
});

//Help
app.intent('Help', (conv, { param }) => {
    const help_ssml = '<speak>' + '<p>' + '<parsody rate="slow"> <s> Here are some Tips :</s> <s> Every Question Has Four options , you can choose any one of it. </s> <break strength="weak" /> <s> If you didn"t hear Question properly you can always ask to repeat.</s> <break strength="weak" /> <s> Your rank will be calculated at end of the Quiz. try to Stay at the Top !!!</s><break strength="weak" /> <s> If you need help Just call Out "help"</s></parsody>' + '</p>' + '</speak>';
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

function getRandArray(max) {
    let rand_array = [];
    for (let i = 0; i < max || rand_array.length != 5; i++) {
        let random = Math.floor(Math.random() * Math.floor(max)).toString();
        if (!(rand_array.includes(random))) {
            rand_array.push(random);
        }
    }
    return rand_array;
}

function getQuestion(grade) {
    let randArray = getRandArray(total_question_no);
    const gradeQuestionRef = db.collection("Questions:" + grade.toString().trim());
    return gradeQuestionRef.where('num', 'in', randArray).get()
        .then(function(querySnapshot) {
            console.log("doc came");
            querySnapshot.forEach(function(doc) {
                Questions.push(doc.data())
            });
        })
        .catch(function(error) {
            console.log("Error getting documents: ", error);
        });
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