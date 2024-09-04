import os

def write_js_files_to_text(folder_path, output_file):
    with open(output_file, 'w') as outfile:
        for filename in os.listdir(folder_path):
            if filename.endswith('.js'):
                file_path = os.path.join(folder_path, filename)
                with open(file_path, 'r') as infile:
                    outfile.write(f"// {filename}\n")
                    outfile.write(infile.read())
                    outfile.write("\n\n")  # Separate files by two newlines

if __name__ == "__main__":
    folder_path = os.getcwd()  # Get the current working directory
    output_file = "output.txt"  # Output text file

    write_js_files_to_text(folder_path, output_file)
    print(f"All .js files have been written to {output_file}.")
