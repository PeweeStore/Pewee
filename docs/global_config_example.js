{
	"cookieSecret": "A Cookie Secret string",

	"secretToken": "A Secret token need to be knowed by build uploader and admin",

  "storeName" : "Any custom name of your store"

  "hello" : {

    "title": "A title showed on the home page",

    "message": "A message placed below title on the home page",

		"logo": "A custom file place at the root to present as the store logo"

  },

	"contactEmail" : "myname@myprovider.com",

	"httpsKeyFilePath": "Key file of SSL Certificate (.key file)",

	"httpsCertificateFilePath": "SSL Certificate file (.pem file)",

	"httpsCAFilePath": "SSL CA Certificate file (.pem of CA)",

  "showHomeStore" : true,

	"customCSS" : "A custom file placed at the root to customized the css store",

	/* Global auto clean rule applyed to project if no surcharged on project */
	"globalAutoCleanRule": {

		/* kind of rule, actualy, only creation_date exist */
		"rule": "creation_date",

		/* Number of file to keep (each per platform) */
		"number": 3
	}

}
