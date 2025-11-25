const sql=require('mysql2');

//Open database connection
const connection=sql.createConnection({
	host: '34.138.215.83',
	user: 'nodeUser',
	password: 'M#Kk6U]_/hN2uC|5',
	database: 'hangingLibraries'
});

//Connect to db
connection.connect(error => {
	if (error){
		console.error('Error connecting to the database:', error);
		return;
	}
	console.log('Connected to the database');
});

//run database query
/*connection.query('SELECT * FROM BOOKS', (error,results) => {
	if (error){
		console.error('Error executing query:', error);
		return;
	}
	console.log('Query results:',results);
});
*/

//Making it into a function
function bookTitleSearch(searchTerm){
	const sqlPrefix = "SELECT * FROM BOOKS WHERE Title LIKE '%";
	const sqlQuery = sqlPrefix.concat(searchTerm,"%'");
	connection.query(sqlQuery, (error,results) => {
		if (error){
			console.error('Error executing query:', error);
			return;
		}
		console.log('Query for '+searchTerm+' results:', results);
	});
};

//Generalizing above function even more
//Though probably best to hard code table and column in practice. 
//But also don't need to specifically avoid injection attacks so should be fine
function tableSearch(table, column, searchTerm){
	const sqlQuery = "SELECT * FROM " + table + " WHERE " + column + " LIKE '%" + searchTerm + "%'";
	connection.query(sqlQuery, (error,results) => {
		if (error){
			console.error('Error executing query:', error);
			return;
		}
		console.log('Query for "' + searchTerm + '" search results:', results);
	});
};

//Prepared statement testing
function tableSearchPrepared(table, column, searchTerm){
	const sqlQuery = "SELECT * FROM ? WHERE ? LIKE '%?%'";
	const array = [(table, column, searchTerm)];
	connection.query(sqlQuery, array, (error,results) => {
		if (error){
			console.error('Error executing query:', error);
			return;
		}
		console.log('Query for "' + searchTerm + '" search results:', results);
	});
};

//Login function
function login(username,password){
	const sqlQuery = "SELECT * FROM ACCOUNT WHERE Pref_EMAIL = '"+username+ "' AND Password = '" + password+"'";
	connection.query(sqlQuery, (error,results) => {
		if (error){
			console.error('Error logging in: ', error);
			return;
		}
		if (results.length === 0){
			console.log('Login unsucessful, check username and password');
			return;
		};
		console.log('Login successful for user: ', results);
	});
};

//Run query function with search term
//bookTitleSearch('optics')

//Run query function with table, column, and search term
tableSearch('BOOKS', 'TITLE', 'optics');

//tableSearchPrepared('BOOKS','TITLE','optics');

//Login function
login('test@hanginglibraries.com','testPassword');

//close connection
connection.end();
