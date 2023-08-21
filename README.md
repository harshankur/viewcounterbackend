# Overview
This is a mini node server that can be used to register user views on websites on a mysql instance.

This is a very simple implementation that I use myself to register views from users that stored country information, timestamp and ip of the user view on a table for the appId.

It also contains provision to validate input data to prevent sql injection.

## How to Proceed
1. Clone this repo and install node modules
```bash
# Clone repo
git clone https://github.com/harshankur/viewcounterbackend.git
# Install node modules
npm i
```
2. Add dbInfo.json that contains the information for accessing your db inside of the repository like below
```json
{
    "host":     "<hostname>",       // 127.0.0.1 for localhost
    "database": "<db name>",
    "user":     "<db user>",
    "password": "<db password>"
}
```
3. Add allowed.json that contains the validation information for registering views as required for your needs. This also saves us from sql injection as the values will be validation before adding to insert statements
```json
{
    "appId": [
        "<app_name_1>",
        "<app_name_2>"
    ],
    "deviceSize": [
        "<device_size_1>",
        "<device_size_2>",
        "<device_size_3>"
    ]
}
```
4. Alter the code, dbInfo.json and allowed.json to suit your needs for registering columns into your mysql instance.
5. Run the server and expose the relevant port
```bash
# Start
npm start
# nohup initialization
nohup node index.js > stdout.log &
# Kill nohup
kill <pid_generated_after_running_above_nohup_command>
```