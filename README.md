# drachtio-srs-freeswitch

A simple drachtio and freeswitch-based SIPREC recording server.  The application receives multipart SDP from the SIPREC client, creates two separate endpoints on freeswitch and responds to the SRC with an SDP that combines the session descriptions into a single SDP.  

This requires a simple freeswitch dialplan along the lines of this:

```
    <extension name="record">
       <condition field="destination_number" expression="^record-(.*)-(.*)$">
          <action application="answer"/>
          <action application="mkdir" data="$${base_dir}/recordings/$1"/>
          <action application="record" data="$${base_dir}/recordings/$1/$2.wav 600000 0 600000"/>
       </condition>
    </extension>
```
