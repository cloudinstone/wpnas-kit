PLUGIN_NAME = $(word $(words $(subst /, ,$(CURDIR))),$(subst /, ,$(CURDIR)))
PLUGIN_DIR = $(CURDIR)
LANG_DIR = $(PLUGIN_DIR)/languages

# print variables to make sure they are correct
print:
	@echo CURDIR: $(CURDIR)
	@echo PLUGIN_NAME: $(PLUGIN_NAME)
	@echo PLUGIN_DIR: $(PLUGIN_DIR)
	@echo LANG_DIR: $(LANG_DIR)

# Generate POT file
pot:
	mkdir -p $(LANG_DIR)
	wp i18n make-pot . languages/$(PLUGIN_NAME).pot

po:
	@echo "Generating PO file for language: $(lang)"
	msginit --input=languages/$(PLUGIN_NAME).pot --output=languages/${PLUGIN_NAME}-$(lang).po --locale=$(lang) --no-translator

update-po:
	wp i18n update-po languages/$(PLUGIN_NAME).pot
	
mo:
	wp i18n make-mo languages

backup:
	git add .
	git commit -m "Backup"
	git push origin master