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

//Run query function with search term
//bookTitleSearch('optics')

//Run query function with table, column, and search term
tableSearch('BOOKS', 'TITLE', 'optics')

//close connection
connection.end();
