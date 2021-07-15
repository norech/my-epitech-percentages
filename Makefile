INPUT = src

OUTPUT = my_epitech_percentages.crx.zip

compress:
	rm -f $(OUTPUT)
	cd $(INPUT) && zip -r ../$(OUTPUT) .
