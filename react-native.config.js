module.exports = {
    dependency: {
        platforms: {
            android: {
                packageImportPath: "import com.dtroncoso.billsplitter.MyCustomModule;",
                packageInstance: "new MyCustomModule()",
                packageName: "com.dtroncoso.billsplitter"
            }
        }
    }
};
