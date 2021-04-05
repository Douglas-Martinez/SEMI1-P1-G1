// AWS Lex connection details. You need to edit these.
var lexruntime = new AWS.LexRuntime({region: '',
				     accessKeyId: '',
				     secretAccessKey: ''});

function chatBot() {
	
	// current user input
	this.input;
	
	/**
	 * respondTo
	 * 
	 * return nothing to skip response
	 * return string for one response
	 * return array of strings for multiple responses
	 * 
	 * @param input - input chat string
	 * @return reply of chat-bot
	 */
	this.respondTo = function(input) {
	
	    	this.input = input.toLowerCase();

	        // Send text to Lex bot. 
	        var params = {
	           botAlias: 'UBot', 
	           botName: 'UBot',
	           inputText: this.input,
	           userId: '',
	           sessionAttributes: {
		       'Location': 'New York'
	           }    
	        };

	        // Lex callback function
	        function lexCallBack(err,data) {
	           if (err) {
		       console.log(err, err.stack);    // an error occurred
	           } else  {	    
		       console.log(data);              // successful response
	           }
	        }
		
	        // Call to Lex, this will result in callback to this function (lexReturn)
	        request = lexruntime.postText(params,lexCallBack);

	        // We return the full AWS response object as calling code can handle asynchronous update
	        return request;  
	}

        // Function to process the lext response before showing to the user. This is where you'd need to add
        // actions based on the Lex Fullfillment
        this.extractLexAnswer = function(lexResp) {

	        var message = '';

	        console.log(lexResp);

	        if(lexResp.response.data.dialogState == 'ReadyForFulfillment') {
	              message = "Ok, obteniendo la informacion para ".concat(lexResp.response.data.intentName);
	        } else {
	              message = lexResp.response.data.message;
                }
	        return message;
        }
	
	/**
	 * match
	 * 
	 * @param regex - regex string to match
	 * @return boolean - whether or not the input string matches the regex
	 */
	this.match = function(regex) {
	
		return new RegExp(regex).test(this.input);
	}
}
