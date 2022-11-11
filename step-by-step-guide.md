
# Quick steps to develop and submit your device driver

For more details, please study the content of the `development-guide` folder that explains all details on how a driver works and prenests templates.

1. Visit the ThingPark X IoT Flow Driver Catalogue repository on Github:  
   https://github.com/actility/thingpark-iot-flow-driver-catalogue

2. Review the content of the `development-guide` folder that explains all details on how a driver
   works and prenests templates.

3. Sign in to github

4. Fork the repository under your own github account.  
   (Click on the "Fork" button on the top right of the page.)

5. Open a terminal window and clone the forked repository.
    ```
    git clone https://github.com/<YOUR_GITHUB_USERNAME>/thingpark-iot-flow-driver-catalogue.git
    ```
6. Figure out your driver's main identifier parameters
   -  `application.producerId`: *the name of the device maker*
   -  `application.moduleId`: *the name of a specific device*    
      *or in case this is a generic driver that can be used for all devices set this parameter to `generic`*

7. Start developing your driver from a template
    - Enter the repo's directory
      ```
      cd thingpark-iot-flow-driver-catalogue
      ```
    - Create a new branch for your driver  
        ```
        git checkout -b <BANCHNAME>
        ```
        - The `<BANCHNAME>` parameter should be in the following format: `@<actilitypublic>-<application.producerId>-<application.moduleId>`
    - Copy the template    
      *You can copy either the `simple-template` or `advanced-template` folder. The example below is copying the `simple-template`.*
      ```
      mkdir <application.producerId>
      cp ./development-guide/templates/simple-driver ./<application.producerId>/<application.moduleId>
      cd <application.producerId>/<application.moduleId>
      ```
      *Please make sure that the name of the directory "<application.producerId>" is in lowercase.*
    - Install the test framework (defined in the devDependencies field of the `package.json` file)
      ```
      npm install
      ```

8. Open your favourite IDE to edit the code of the actual directory  
   (If you use Visual Studio Code, execute the following command:)
    ```
    code .
    ```

9. Edit and update the `package.json` file
    - Don't change the `scripts`, `driver.producerId`, `driver.type`, `driver.private`
      and `devDependencies` properties.
    - Don't change the scope in the name of the package which is `actilitypub`.
    - Don't change `main` if you are not developing an advanced driver.
    - Please note that the current driver framework does not support nodejs dependencies, 
      therefore you mustn't add any dependencies to the `package.json` file.
    - The `points` object is optional, and defines a common, vendor-independent ontology 
      for the decoded message payload.

10.  Replace the content of the index.js file so that the signature of the 
`decodeUplink`, `decodeDownlink`, `encodeDownlink` and `extractPoints` functions do not change.
Only the `decodeUplink` function is mandatory that's output is an object representing 
the decoded payload in any format the device maker prefers.
The optional `extractPoints` function can be used to convert the output of the `decodeUplink`
function to a vendor independent common ontology defined in the package.json file.

11. Replace the files in the `examples` and `errors` folder that are used for unit tests.
Those files should include real example payloads and their decoded versions sent by
the device.

12. Run the unit tests:
    ```
    npm test
    ```

13. Push your modified files back to your forked repo
    ```
    git status
    git add .
    git commit -m "new-device initial commit"
    git push origin new-driver-<actilitypub>-<application.producerId>-<application.moduleId>
    ```

14. Creat a pull request
    - On the github webpage of your forked repo click on the "Compare & pull request" button
    - Fill in the form
    - Click on the "Create pull request" button
