# fa-scripts
Utility scripts for Fusion Auth to download and upload data from source & target respectively.

# Command line library used
https://www.npmjs.com/package/nestjs-command

## Run program
Please ensure the variables have been configured for source & target Fusion Auth URLs & API keys (as available in sample `.env.example`).
- Command to download data from source: `npx nestjs-command download:users {application-id-here}`
- Command to upload data to source: `npx nestjs-command upload:users {application-id-here}`

You can also hit the below mentioned APIs:
- Download:
```
GET http://localhost:3000/fa-data-migrate/download?applicationId={application-id-here}
```

- Upload:
```
GET http://localhost:3000/fa-data-migrate/upload?applicationId={application-id-here}
```

- Delete:
```
POST {{url}}/fa-data-migrate/delete-target-users?applicationId={application-id-here}
```

**Note:-**
- Ensure the API key you are using has access to search users API for downloading the data.
- Ensure the API key you are using has access to bulk users import API for uploading the data.
- Ensure the API key you are using has access to delete users API for deleting the data.
- Both the command & the download APi will create file named `{application-id-here}.txt` at path `gen/json` which contains each user row JSON at each line. If FA Elastic Search responds with any error or request timed out, the codes will keep trying to download the data unless all the records have been downloaded.
- Before uploading data, make sure all the Application IDs exists on target FA and have the respective roles created beforehand. The list of Application IDs and roles information is available in the file generated at path `gen/json/{application-id-here}-addons.json` (directory available at root path). 